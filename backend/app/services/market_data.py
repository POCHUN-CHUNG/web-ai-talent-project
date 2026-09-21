import logging
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import pandas as pd
import requests
import yfinance as yf
from dateutil.relativedelta import relativedelta
from sqlalchemy import delete, select, text, tuple_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import DailyPrice, StockInfo
from app.services.n8n_result import with_retry
from app.services.stock_info import BENCHMARK_ROW

logger = logging.getLogger(__name__)

# ── 抓取設定 ──
TAIPEI = ZoneInfo("Asia/Taipei")
BENCHMARK_SYMBOL = BENCHMARK_ROW["symbol"]  # 大盤指數代號 IR0001
LOOKBACK_YEARS = 10  # 首次全量抓取與資料保留期：今天往前 10 年（與規格書「保留期＝分析上限 10 年」一致）
LOOKBACK_BUFFER_DAYS = 31  # 再多留 31 天緩衝（規格書 PRICE_RETENTION_BUFFER_DAYS 預設值）
RECENT_MONTHS = 1  # 日常只抓過去 1 個月（已有資料的股票；大盤從 1 個月前的那個月 1 日起），同一代號同一天直接覆蓋
RESTATE_TOLERANCE = Decimal("0.0001")  # 舊資料與新抓取同一天的價格相差超過 0.01% 視為除權息還原基準改變
JUMP_THRESHOLD = 0.11  # 單日漲跌幅超過 11%（台股漲跌幅上限 10%）列為異常，僅提醒不擋
SMALL_BATCH = 5  # 小於這個檔數的批次若全空，視為「查無資料」而非被擋（日常只會剩少數 Yahoo 沒有的代號）
YF_BATCH_SIZE = 50  # 每批向 yfinance 一次抓幾檔
YF_BATCH_PAUSE = 1  # 批次之間休息幾秒，降低被擋機率
TWSE_MONTH_PAUSE = 2  # 證交所每抓一個月休息幾秒（一次只回一個月，10 年要抓約 120 次）
MAX_CONSECUTIVE_BATCH_FAILURES = 3  # 連續幾批整批失敗就判定被擋、停止繼續（避免一直敲對方）
MARKET_CLOSE_HOUR = 14  # 台北時間 14 點前當天尚未收盤，不寫入當天的價格
UPSERT_CHUNK = 5000  # 每次寫入資料庫的最大筆數
TWSE_URL = "https://www.twse.com.tw/rwd/zh/TAIEX/MFI94U?response=json&date={date}"
TWSE_NO_DATA_KEYWORD = "沒有符合條件"  # 證交所「該月確實沒有資料」的回應關鍵字（與被擋、出錯不同）
FAILED_LIST_LIMIT = 100  # 回傳給 n8n 的失敗清單最多列幾項


@dataclass
class FetchReport:
    # 【抓取結果統計】記錄這次成功幾檔、失敗哪些、寫入幾列。
    success_count: int = 0  # 成功筆數（以代號計：一檔股票或大盤指數算一筆）
    stock_success: int = 0  # 個股成功筆數
    index_success: int = 0  # 大盤指數成功筆數（0 或 1）
    failed: list[dict] = field(default_factory=list)  # 失敗清單：[{"symbol": 代號, "reason": 原因}]
    # 查無資料的代號（不算失敗）：同一批其他檔都抓得到，只有它 Yahoo 本來就沒有價格（如部分債券 ETF、剛上市的標的）
    no_data: list = field(default_factory=list)  # 抓取當下是代號字串；彙整時換成 {"symbol", "name"}
    rows_written: int = 0  # 實際寫入（新增或覆寫）的資料列數
    restated: list[str] = field(default_factory=list)  # 因除權息還原基準改變而整檔重抓的代號
    deleted: int = 0  # 清除的過期資料列數
    abnormal: list[dict] = field(default_factory=list)  # 近期單日漲跌幅異常的紀錄（僅提醒）

    @property
    def fail_count(self) -> int:
        # 失敗筆數（以代號計）
        return len(self.failed)


def default_start_date(today: date) -> date:
    # 【預設起始日期】今天往前 10 年再加 31 天。用日曆計算而非固定天數，閏年才不會少算。
    # 參數：today=今天（台北時區）
    return today - relativedelta(years=LOOKBACK_YEARS) - timedelta(days=LOOKBACK_BUFFER_DAYS)


def _is_writable_date(trade_date: date, now: datetime) -> bool:
    # 【該日價格是否可寫入】週六日休市，Yahoo 偶爾會多送假資料列（價格常是亂跳的），一律不寫；
    # 當天還沒收盤（台北時間 14 點前）的價格是盤中價，也不寫。
    # 參數：trade_date=該筆價格的日期、now=現在時間（台北時區）
    if trade_date.weekday() >= 5:
        return False
    return not (trade_date == now.date() and now.hour < MARKET_CLOSE_HOUR)


def _to_decimal(value: float) -> Decimal | None:
    # 【價格轉小數】轉成資料庫用的 4 位小數；空值、非數字或不大於 0 回傳 None（該筆丟棄）。
    # 參數：value=原始價格
    if value is None or pd.isna(value):
        return None
    d = Decimal(str(round(float(value), 4)))
    return d if d > 0 else None


def _upsert_prices(db: Session, rows: list[dict]) -> int:
    # 【寫入日收盤價】以（代號＋交易日）為依據：沒有就新增，已有就直接覆寫收盤價。每次呼叫獨立提交，失敗會復原該次寫入。
    # 參數：db=資料庫連線、rows=[{"symbol":…, "adj_close":Decimal, "trade_date":date}]；回傳寫入列數
    if not rows:
        return 0
    # 1. 同一代號同一天只留一列（同一道寫入指令不可重複命中同一列）
    unique = {(r["symbol"], r["trade_date"]): r for r in rows}
    values = list(unique.values())
    try:
        for i in range(0, len(values), UPSERT_CHUNK):
            stmt = insert(DailyPrice).values(values[i : i + UPSERT_CHUNK])
            # 2. 代號＋日期重複時改成覆寫
            stmt = stmt.on_conflict_do_update(
                constraint="uq_daily_prices", set_={"adj_close": stmt.excluded.adj_close}
            )
            db.execute(stmt)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return len(values)


# ───────────────────────── 個股收盤價（yfinance） ─────────────────────────


def _yf_ticker(symbol: str, market: str) -> str:
    # 【換成 yfinance 代號】上市加 .TW、上櫃加 .TWO。只在抓取時轉換，資料庫一律存純代號。
    # 參數：symbol=純代號、market=市場別（上市／上櫃）
    return f"{symbol}.TW" if market == "上市" else f"{symbol}.TWO"


def _download(tickers: list[str], start: date, end: date) -> dict[str, list[tuple[date, Decimal]]]:
    # 【向 yfinance 下載】回傳「yfinance 代號 → [(日期, 還原收盤價)]」；查無資料的代號不會出現在結果中。
    # 網路錯誤、被擋等會直接丟出錯誤，交給重試機制處理。
    # 參數：tickers=yfinance 代號清單、start=起始日、end=結束日（不含當天）
    # 1. auto_adjust=True 時 Close 即為還原除權息後的價格
    df = yf.download(tickers, start=start.isoformat(), end=end.isoformat(), auto_adjust=True, progress=False)
    if df is None or df.empty:
        return {}
    close = df["Close"]
    if not isinstance(close, pd.DataFrame):  # 保險：只有一檔時有些版本回傳單一欄位
        close = close.to_frame(name=tickers[0])
    # 2. 每檔取出有值的收盤價；空值（該檔當天沒交易）與不合理的價格一律丟棄，不寫進資料庫
    result: dict[str, list[tuple[date, Decimal]]] = {}
    for ticker in close.columns:
        points = []
        for ts, value in close[ticker].items():
            price = _to_decimal(value)
            if price is not None:
                points.append((pd.Timestamp(ts).date(), price))
        if points:
            result[str(ticker)] = points
    return result


def _download_batch(tickers: list[str], start: date, end: date) -> dict:
    # 【整批下載】一次抓一批；若整批都是空的，視為被擋或來源異常（正常不會 50 檔全部沒資料），丟出錯誤觸發重試。
    # 參數：同 _download
    data = _download(tickers, start, end)
    if not data and len(tickers) >= SMALL_BATCH:
        raise ValueError("yfinance 回傳空資料（可能被限流或來源異常）")
    return data


def _find_restated(db: Session, data: dict, ticker_to_symbol: dict) -> list[str]:
    # 【找出除權息還原基準改變的股票】還原價在除權息後，Yahoo 會把「整段歷史」重算。若只覆寫最近一個月，
    # 新舊資料的基準不同，接在一起會出現假的暴漲暴跌（會毀掉回撤計算）。
    # 做法：拿這次抓到的「最舊一天」跟資料庫同一天的舊價比，差超過容忍值就代表基準變了。
    # 參數：data=本批抓到的資料、ticker_to_symbol=yfinance 代號對純代號的對照；回傳需要整檔重抓的 yfinance 代號
    probe = {(ticker_to_symbol[t], pts[0][0]): (t, pts[0][1]) for t, pts in data.items() if pts}
    if not probe:
        return []
    old_rows = db.execute(
        select(DailyPrice.symbol, DailyPrice.trade_date, DailyPrice.adj_close).where(
            tuple_(DailyPrice.symbol, DailyPrice.trade_date).in_(list(probe))
        )
    ).all()
    flagged = []
    for symbol, d, old in old_rows:
        ticker, new = probe[(symbol, d)]
        if abs(new - old) / old > RESTATE_TOLERANCE:
            flagged.append(ticker)
    return flagged


def _fetch_group(
    db: Session, ticker_to_symbol: dict[str, str], start: date, end: date, now: datetime,
    report: FetchReport, check_restate: bool,
) -> None:
    # 【抓取一組股票】分批下載並「每批立即寫入」。每檔要嘛整段更新、要嘛完全不動，不會寫入半截資料；失敗的下次執行會補回。
    # 參數：ticker_to_symbol=要抓的（yfinance 代號→純代號）、start/end=區間（end 不含當天）、now=現在時間（台北）、
    #       report=累計結果、check_restate=是否檢查除權息基準改變（只抓近期的那組需要）
    tickers = list(ticker_to_symbol)
    logger.info("個股收盤價：%d 檔，區間 %s ~ %s", len(tickers), start, end)
    consecutive_failures = 0
    for i in range(0, len(tickers), YF_BATCH_SIZE):
        batch = tickers[i : i + YF_BATCH_SIZE]

        # 1. 整批下載（失敗自動重試）；連續多批整批失敗＝被擋，停止並把剩下的都記為失敗
        try:
            data = with_retry(lambda b=batch: _download_batch(b, start, end), f"yfinance 第 {i // YF_BATCH_SIZE + 1} 批", logger)
            consecutive_failures = 0
        except Exception as exc:  # noqa: BLE001
            consecutive_failures += 1
            reason = f"整批下載失敗：{exc}"[:200]
            report.failed += [{"symbol": ticker_to_symbol[t], "reason": reason} for t in batch]
            if consecutive_failures >= MAX_CONSECUTIVE_BATCH_FAILURES:
                stop_reason = "連續多批失敗，疑似被來源封鎖，已中止"
                report.failed += [{"symbol": ticker_to_symbol[t], "reason": stop_reason} for t in tickers[i + YF_BATCH_SIZE :]]
                logger.error(stop_reason)
                return
            time.sleep(YF_BATCH_PAUSE)
            continue

        # 2. 這批裡沒有資料的代號，逐檔再抓一次確認（單檔出錯會重試而算失敗；回空表代表 Yahoo 確實沒有資料）
        for t in [t for t in batch if t not in data]:
            try:
                single = with_retry(lambda t=t: _download([t], start, end), f"yfinance {t}", logger)
            except Exception as exc:  # noqa: BLE001
                report.failed.append({"symbol": ticker_to_symbol[t], "reason": f"下載失敗：{exc}"[:200]})
                continue
            if single.get(t):
                data[t] = single[t]
            else:
                # 同批其他檔正常、單獨重抓也是空表 → Yahoo 沒有這檔的資料（不是被擋），列入「查無資料」而非失敗
                report.no_data.append(ticker_to_symbol[t])

        # 3. 除權息檢查：基準變了的股票改成整段（10 年）重抓；重抓失敗就這次完全不動它（舊資料一致，明天再試）
        if check_restate:
            for t in _find_restated(db, data, ticker_to_symbol):
                try:
                    full = with_retry(lambda t=t: _download([t], default_start_date(now.date()), end), f"yfinance 重抓 {t}", logger)
                except Exception as exc:  # noqa: BLE001
                    full = {}
                    logger.warning("重抓 %s 失敗：%s", t, exc)
                if full.get(t):
                    data[t] = full[t]
                    report.restated.append(ticker_to_symbol[t])
                else:
                    data.pop(t, None)
                    report.failed.append({"symbol": ticker_to_symbol[t], "reason": "除權息還原基準改變，整檔重抓失敗，已保留舊資料"})

        # 4. 這批成功的立即寫入資料庫並提交（就算後面中斷，已寫入的資料仍完整）
        rows = [
            {"symbol": ticker_to_symbol[t], "adj_close": price, "trade_date": d}
            for t, points in data.items()
            for d, price in points
            if _is_writable_date(d, now)
        ]
        try:
            report.rows_written += _upsert_prices(db, rows)
            report.success_count += len(data)
        except Exception as exc:  # noqa: BLE001
            logger.exception("寫入個股收盤價失敗")
            report.failed += [{"symbol": ticker_to_symbol[t], "reason": f"寫入資料庫失敗：{exc}"[:200]} for t in data]
        time.sleep(YF_BATCH_PAUSE)


def fetch_stock_prices(db: Session, now: datetime) -> FetchReport:
    # 【抓取個股收盤價】依股票基本資料建立清單（上市 .TW、上櫃 .TWO）。
    # 資料庫「已有價格」的股票只抓過去 1 個月（直接覆蓋原有的值，並檢查除權息還原基準是否改變）；「完全沒有價格」的股票（首次上線、新上市）抓 10 年又 31 天。
    # 參數：db=資料庫連線、now=現在時間（台北）
    report = FetchReport()
    today = now.date()
    end = today + timedelta(days=1)  # yfinance 的結束日不含當天，加 1 天才會包含今天
    # 1. 從股票基本資料取出要抓的股票（排除大盤指數），並找出資料庫已有價格的代號
    stocks = db.execute(
        select(StockInfo.symbol, StockInfo.market)
        .where(StockInfo.market.in_(["上市", "上櫃"]))
        .order_by(StockInfo.symbol)
    ).all()
    have = set(db.execute(select(DailyPrice.symbol).distinct()).scalars())
    recent = {_yf_ticker(s, m): s for s, m in stocks if s in have}
    backfill = {_yf_ticker(s, m): s for s, m in stocks if s not in have}
    # 2. 日常組：過去 1 個月，同一代號同一天直接覆蓋，並檢查除權息基準是否改變
    _fetch_group(db, recent, today - relativedelta(months=RECENT_MONTHS), end, now, report, check_restate=True)
    # 3. 首次組：10 年又 31 天（沒有舊資料，不需檢查基準）
    _fetch_group(db, backfill, default_start_date(today), end, now, report, check_restate=False)
    return report


# ───────────────────────── 大盤指數（證交所 MFI94U） ─────────────────────────


def _roc_to_date(roc_text: str) -> date:
    # 【民國年轉西元日期】例如 "105/09/01" → 2016-09-01。
    # 參數：roc_text=民國年格式的日期字串
    y, m, d = roc_text.strip().split("/")
    return date(int(y) + 1911, int(m), int(d))


def _fetch_month(month_first: date) -> list[tuple[date, Decimal]]:
    # 【抓一個月的大盤指數】向證交所抓單月報酬指數。「該月確實沒資料」回傳空清單；
    # 被擋、逾時、格式不符等一律丟出錯誤（不可當成沒資料，否則資料庫會出現缺口）。
    # 參數：month_first=該月 1 日
    res = requests.get(TWSE_URL.format(date=month_first.strftime("%Y%m01")), timeout=15)
    res.raise_for_status()
    body = res.json()
    stat = str(body.get("stat", ""))
    # 1. 成功：轉成（西元日期, 指數收盤值），日期為民國年、數值含千分位逗號
    if stat == "OK":
        points = []
        for roc_date, value in body.get("data") or []:
            price = _to_decimal(float(str(value).replace(",", "")))
            if price is not None:
                points.append((_roc_to_date(roc_date), price))
        return points
    # 2. 證交所明確表示該月沒有資料
    if TWSE_NO_DATA_KEYWORD in stat:
        return []
    # 3. 其他一律視為失敗
    raise ValueError(f"證交所回應異常：{stat}")


def fetch_index_prices(db: Session, start: date, now: datetime) -> FetchReport:
    # 【抓取大盤指數】從起始月份逐月抓到本月，「每個月抓完立即寫入」。
    # 為了讓資料庫永遠連續：依時間順序進行，任何一個月重試後仍失敗就停在該月之前，
    # 不跳過、不寫入更後面的月份（下次執行會從缺口補起）。
    # 參數：db=資料庫連線、start=起始日（決定從哪個月開始）、now=現在時間（台北）
    report = FetchReport()
    # 1. 確保股票基本資料裡有 IR0001（日收盤價的代號必須先存在於基本資料）
    try:
        db.execute(insert(StockInfo).values(**BENCHMARK_ROW).on_conflict_do_nothing(index_elements=["symbol"]))
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("建立 IR0001 基本資料失敗")
        report.failed.append({"symbol": BENCHMARK_SYMBOL, "reason": f"建立基本資料失敗：{exc}"[:200]})
        return report

    # 2. 由舊到新逐月處理
    month = start.replace(day=1)
    last_month = now.date().replace(day=1)
    while month <= last_month:
        try:
            points = with_retry(lambda m=month: _fetch_month(m), f"證交所 {month:%Y-%m}", logger)
        except Exception as exc:  # noqa: BLE001
            report.failed.append(
                {"symbol": BENCHMARK_SYMBOL, "reason": f"{month:%Y-%m} 抓取失敗，已停在此月之前：{exc}"[:200]}
            )
            return report
        # 3. 只寫起始日之後、且已收盤的資料；寫入失敗同樣停在此處
        rows = [
            {"symbol": BENCHMARK_SYMBOL, "adj_close": price, "trade_date": d}
            for d, price in points
            if d >= start and _is_writable_date(d, now)
        ]
        try:
            report.rows_written += _upsert_prices(db, rows)
        except Exception as exc:  # noqa: BLE001
            logger.exception("寫入大盤指數失敗")
            report.failed.append({"symbol": BENCHMARK_SYMBOL, "reason": f"{month:%Y-%m} 寫入資料庫失敗：{exc}"[:200]})
            return report
        month += relativedelta(months=1)
        time.sleep(TWSE_MONTH_PAUSE)

    report.success_count = 1  # 整段都成功，大盤指數算 1 筆
    return report


# ───────────────────────── 每日總流程 ─────────────────────────


def _purge_expired(db: Session, today: date) -> int:
    # 【清除過期資料】刪除超過保留期（10 年又 31 天前）的日收盤價，回傳刪除列數。只在本次抓取全部成功後執行，
    # 避免「資料停止更新、又持續被刪短」。參數：db=資料庫連線、today=今天
    cutoff = default_start_date(today)
    try:
        result = db.execute(delete(DailyPrice).where(DailyPrice.trade_date < cutoff))
        db.commit()
        return result.rowcount or 0
    except Exception:
        db.rollback()
        logger.exception("清除過期資料失敗")
        return 0


def _find_abnormal_jumps(db: Session, today: date) -> list[dict]:
    # 【找出近期異常跳動】列出近 14 天內單日漲跌幅超過 11% 的紀錄（台股漲跌幅上限為 10%），
    # 常見原因是新上市初期、除權息還原問題或來源資料錯誤。僅提醒，不影響成敗。參數：db=資料庫連線、today=今天
    rows = db.execute(
        text(
            """
            SELECT symbol, trade_date, prev, adj_close FROM (
                SELECT symbol, trade_date, adj_close,
                       LAG(adj_close) OVER (PARTITION BY symbol ORDER BY trade_date) AS prev
                FROM daily_prices WHERE trade_date >= :since
            ) t
            WHERE prev IS NOT NULL AND trade_date >= :report_from
              AND ABS(adj_close / prev - 1) > :threshold
            ORDER BY ABS(adj_close / prev - 1) DESC LIMIT :limit
            """
        ),
        {"since": today - timedelta(days=30), "report_from": today - timedelta(days=14),
         "threshold": JUMP_THRESHOLD, "limit": FAILED_LIST_LIMIT},
    ).all()
    return [
        {"symbol": r.symbol, "trade_date": r.trade_date.isoformat(),
         "change": round(float(r.adj_close / r.prev - 1), 4)}
        for r in rows
    ]


def run_daily_fetch(db: Session) -> FetchReport:
    # 【每日抓取】依序抓「個股收盤價」與「大盤指數」，兩者互不影響（其中一個失敗，另一個照常完成）。
    # 起訖日期全部由後端決定，n8n 不需傳任何參數：
    #   個股：資料庫已有資料的抓過去 1 個月；沒有資料的（首次上線、新上市）抓 10 年又 31 天。
    #   大盤：資料庫已有資料就從「1 個月前的那個月 1 日」抓到本月；完全沒有資料才抓 10 年又 31 天。
    # 全部成功後清除過期資料。同一代號同一天已有資料時直接覆寫。參數：db=資料庫連線
    now = datetime.now(TAIPEI)
    today = now.date()

    # 1. 個股收盤價
    stocks = fetch_stock_prices(db, now)
    # 2. 大盤指數：有舊資料只補近 1 個月（證交所一次只回一個月，從 1 個月前的月初開始抓，涵蓋上個月與本月）
    has_index = db.execute(select(DailyPrice.id).where(DailyPrice.symbol == BENCHMARK_SYMBOL).limit(1)).first()
    index_start = (today - relativedelta(months=RECENT_MONTHS)).replace(day=1) if has_index else default_start_date(today)
    index = fetch_index_prices(db, index_start, now)
    # 3. 合併統計
    total = FetchReport(
        success_count=stocks.success_count + index.success_count,
        stock_success=stocks.success_count,
        index_success=index.success_count,
        failed=stocks.failed + index.failed,
        no_data=stocks.no_data,
        rows_written=stocks.rows_written + index.rows_written,
        restated=stocks.restated,
    )
    # 3-1. 「查無資料」清單補上股票名稱，讓人一看就知道是哪一檔
    names = dict(db.execute(select(StockInfo.symbol, StockInfo.name).where(StockInfo.symbol.in_(total.no_data))).all())
    total.no_data = [{"symbol": sym, "name": names.get(sym, "")} for sym in total.no_data]
    # 4. 全部成功才清除過期資料；並列出近期異常跳動供人工確認
    if total.fail_count == 0:
        total.deleted = _purge_expired(db, today)
    total.abnormal = _find_abnormal_jumps(db, today)
    return total
