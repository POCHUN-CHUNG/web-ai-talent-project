import math
from collections import defaultdict
from decimal import Decimal

import numpy as np
from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import AnalysisResult, BankRate, DailyQuote, HoldingLot, Portfolio, RiskProfile, StockInfo, User
from app.services.questionnaire import QUESTIONS
from app.services.risk_metrics import compute_analysis
from app.services.stock_info import BENCHMARK_ROW

# 【風險分析流程】讀取持股、價格與利率 → 決定分析期間 → 交給 risk_metrics 計算 → 寫入唯讀快照。
# 規則依 spec/04-behavior.md §4.1.0 與 §4.2.4；計算本身全部在 services/risk_metrics.py。

BENCHMARK_SYMBOL = BENCHMARK_ROW["symbol"]  # 市場基準：發行量加權股價報酬指數 IR0001（含息，不是價格指數 IX0001）
MIN_YEARS = 2  # 分析期間下限（年）
DAYS_PER_YEAR = 365.25  # 計算「可分析年數」時一年的平均日曆天數（含閏年）
RATE_OPTIONS = {"zero": "0%", "bank_average": "五大公股銀行平均定存利率"}  # 利率選項與顯示名稱
DEFAULT_RATE_OPTION = "zero"  # 利率選項預設值
REQUEST_KEYS = {"lookbackYears", "rateOption", "profileInputs"}  # 開始分析時允許的欄位
PROFILE_QUESTIONS = {"investmentHorizon": "Q7", "withdrawalNeed": "Q8", "lossTolerance": "Q13"}  # 分析前可調整的問卷參數與對應題號
HISTORY_PAGE_SIZE_MAX = 50  # 歷史清單每頁最多筆數


def invalid(message: str) -> ApiError:
    # 【輸入格式錯誤】建立 400 INVALID_INPUT 錯誤。參數：message=中文說明
    return ApiError(400, "INVALID_INPUT", message)


def _choices(qid: str) -> list[str]:
    # 【題目選項原文】依題號取出全部選項文字。參數：qid=題號（如 Q7）
    return [o["label"] for q in QUESTIONS if q["id"] == qid for o in q["options"]]


def latest_profile(db: Session, user: User) -> RiskProfile:
    # 【最新風險屬性】分析前必須已完成問卷，否則回 409 PROFILE_REQUIRED。參數：db=資料庫連線、user=目前登入者
    p = db.scalar(select(RiskProfile).where(RiskProfile.user_id == user.id).order_by(RiskProfile.created.desc(), RiskProfile.id.desc()))
    if p is None:
        raise ApiError(409, "PROFILE_REQUIRED", "請先完成風險評估問卷")
    return p


def profile_defaults(profile: RiskProfile) -> dict:
    # 【問卷預設值】Q7、Q8、Q13 的作答原文，作為分析前確認彈窗的預設值。參數：profile=風險屬性快照
    q8 = next((f["value_text"] for f in profile.facts if f["id"] == "withdrawal_need"), None)
    return {"investmentHorizon": profile.investment_horizon, "withdrawalNeed": q8, "lossTolerance": profile.loss_tolerance}


def load_holdings(db: Session, portfolio_id: int) -> dict:
    # 【彙總持股】同一檔所有買進紀錄的股數加總；沒有任何買進紀錄回 422。參數：db=資料庫連線、portfolio_id=組合編號
    rows = db.execute(
        select(HoldingLot.symbol, func.sum(HoldingLot.quantity)).where(HoldingLot.portfolio_id == portfolio_id).group_by(HoldingLot.symbol)
    ).all()
    if not rows:
        raise ApiError(422, "INVALID_INPUT", "這個組合還沒有任何買進紀錄，請先新增持股再分析")
    return {s: q for s, q in sorted(rows)}


def load_prices(db: Session, symbols: list[str]) -> dict:
    # 【讀取價格】持股與市場基準的全部還原收盤價，回傳 代號→{日期: 價格}。參數：db=資料庫連線、symbols=持股代號
    series = defaultdict(dict)
    rows = db.execute(
        select(DailyQuote.symbol, DailyQuote.trade_date, DailyQuote.adj_close).where(DailyQuote.symbol.in_([*symbols, BENCHMARK_SYMBOL]))
    )
    for s, d, px in rows:
        series[s][d] = float(px)
    return series


def _names(db: Session, symbols: list[str]) -> dict:
    # 【股票名稱】代號→名稱；查不到時以代號代替。參數：db=資料庫連線、symbols=代號
    found = dict(db.execute(select(StockInfo.symbol, StockInfo.name).where(StockInfo.symbol.in_(symbols))).all())
    return {s: found.get(s, s) for s in symbols}


def common_period(series: dict, symbols: list[str], names: dict) -> dict:
    # 【可分析的最大期間】全部持股與市場基準都有價格的交易日（交集）。
    # 1. 基準沒有資料回 BENCHMARK_UNAVAILABLE；有持股完全沒有價格回 INSUFFICIENT_PRICE_DATA
    # 2. 決定起點的代號＝資料起點最晚者；最大期間不足 2 年回 INSUFFICIENT_PRICE_DATA，並列出資料不足 2 年的持股供前端提醒
    # 參數：series=代號→{日期: 價格}、symbols=持股代號、names=代號→名稱
    if not series.get(BENCHMARK_SYMBOL):
        raise ApiError(422, "BENCHMARK_UNAVAILABLE", "大盤資料目前無法取得，暫時無法分析，請稍後再試")
    missing = [s for s in symbols if not series.get(s)]
    if missing:
        raise ApiError(422, "INSUFFICIENT_PRICE_DATA",
                       f"{_label(missing, names)}目前沒有股價資料，無法分析。請先把這檔從組合移除後再分析",
                       symbols=[{"symbol": s, "name": names.get(s, s), "years": 0.0} for s in missing])
    common = set(series[BENCHMARK_SYMBOL])
    for s in symbols:
        common &= set(series[s])
    dates = sorted(common)
    first = {s: min(series[s]) for s in [*symbols, BENCHMARK_SYMBOL]}
    latest_start = max(first.values())
    limited_by = [s for s, d in first.items() if d == latest_start]
    max_years = 0.0 if len(dates) < 2 else _years(dates[0], dates[-1])
    if max_years < MIN_YEARS:
        end = max(series[BENCHMARK_SYMBOL])
        short = [{"symbol": s, "name": names.get(s, s), "years": _years(first[s], end)}
                 for s in symbols if _years(first[s], end) < MIN_YEARS]
        if short:
            who = "、".join(f"{x['name']}（{x['symbol']}）目前只有約 {x['years']:.1f} 年的股價資料" for x in short)
            message = f"{who}，風險分析至少需要 {MIN_YEARS} 年。請先把這檔從組合移除，或等資料滿 {MIN_YEARS} 年後再分析"
        else:  # 每檔各自都滿 2 年，但彼此都有股價的日子湊不滿 2 年（例如長期停牌）
            message = f"這些持股同時都有股價的期間只有約 {max_years:.1f} 年，風險分析至少需要 {MIN_YEARS} 年"
        raise ApiError(422, "INSUFFICIENT_PRICE_DATA", message, symbols=short)
    return {"dates": dates, "maxYears": max_years, "limitedBy": limited_by}


def _years(start, end) -> float:
    # 【相差年數】兩個日期之間的日曆天數 ÷ 365.25，無條件捨去到小數 2 位。參數：start、end=起訖日期
    return math.floor((end - start).days / DAYS_PER_YEAR * 100) / 100


def _label(symbols: list[str], names: dict) -> str:
    # 【名稱加代號】例「世芯-KY（3661）、中傑-KY（6965）」。參數：symbols=代號、names=代號→名稱
    return "、".join(f"{names.get(s, s)}（{s}）" for s in symbols)


def bank_rate(db: Session):
    # 【五大公股銀行平均利率】各行 1 年期定存機動利率（%）的平均轉成小數；沒有資料回 422。
    # 參數：db=資料庫連線；回傳 (年利率小數, 最新更新時間)
    rows = db.execute(select(BankRate.rate, BankRate.updated)).all()
    if not rows:
        raise ApiError(422, "RISK_FREE_RATE_UNAVAILABLE", "目前還沒有銀行定存利率資料，請改選 0% 或稍後再試")
    rate = sum(Decimal(r) for r, _ in rows) / len(rows) / 100
    return float(rate), max(u for _, u in rows)


def parse_request(body, choices_default: dict) -> dict:
    # 【驗證分析參數】只允許 lookbackYears、rateOption、profileInputs 三個欄位，Q7／Q8／Q13 必須是選項原文。
    # 年數的上限要等算出可分析期間後才檢查（見 run_analysis）。參數：body=請求內容、choices_default=問卷預設值
    body = body or {}
    if not isinstance(body, dict) or set(body) - REQUEST_KEYS:
        raise invalid("只接受 lookbackYears、rateOption、profileInputs 三個欄位")
    years = body.get("lookbackYears")
    if years is not None and (isinstance(years, bool) or not isinstance(years, int)):
        raise invalid("分析期間須為整數年，或留空代表採最大期間")
    rate_option = body.get("rateOption", DEFAULT_RATE_OPTION)
    if rate_option not in RATE_OPTIONS:
        raise invalid("利率選項只能是 zero（0%）或 bank_average（五大公股銀行平均定存利率）")
    given = body.get("profileInputs") or {}
    if not isinstance(given, dict) or set(given) - set(PROFILE_QUESTIONS):
        raise invalid("問卷參數只接受 investmentHorizon、withdrawalNeed、lossTolerance")
    inputs = dict(choices_default)
    for key, value in given.items():
        if value not in _choices(PROFILE_QUESTIONS[key]):
            raise invalid(f"{PROFILE_QUESTIONS[key]} 的值必須是該題的選項原文")
        inputs[key] = value
    inputs["changedFields"] = [k for k in PROFILE_QUESTIONS if inputs[k] != choices_default[k]]
    return {"lookbackYears": years, "rateOption": rate_option, "profileInputs": inputs}


def analysis_options(db: Session, user: User, portfolio: Portfolio) -> dict:
    # 【分析選項】確認彈窗需要的最大期間、利率選項與 Q7／Q8／Q13 預設值。參數：db=資料庫連線、user=目前登入者、portfolio=投資組合
    profile = latest_profile(db, user)
    symbols = list(load_holdings(db, portfolio.id))
    names = _names(db, [*symbols, BENCHMARK_SYMBOL])
    period = common_period(load_prices(db, symbols), symbols, names)
    rows = db.execute(select(BankRate.rate, BankRate.updated)).all()
    bank = bank_rate(db) if rows else (None, None)
    defaults = profile_defaults(profile)
    return {
        "period": {"maxYears": period["maxYears"], "minYears": MIN_YEARS, "startDate": period["dates"][0].isoformat(),
                   "endDate": period["dates"][-1].isoformat(), "limitedBySymbols": period["limitedBy"]},
        "rateOptions": [
            {"key": "zero", "label": RATE_OPTIONS["zero"], "rate": 0.0, "asOf": None},
            {"key": "bank_average", "label": RATE_OPTIONS["bank_average"], "rate": bank[0], "asOf": iso(bank[1]) if bank[1] else None},
        ],
        "profileInputs": {k: {"value": defaults[k], "choices": _choices(q)} for k, q in PROFILE_QUESTIONS.items()},
        "defaults": {"lookbackYears": None, "rateOption": DEFAULT_RATE_OPTION},
    }


def run_analysis(db: Session, user: User, portfolio: Portfolio, body) -> AnalysisResult:
    # 【執行一次分析】驗證參數 → 決定期間 → 算權重與利率 → 計算 → 寫入快照。參數：db=資料庫連線、user=目前登入者、portfolio=投資組合、body=請求內容
    # 1. 參數與前置資料
    profile = latest_profile(db, user)
    req = parse_request(body, profile_defaults(profile))
    holdings = load_holdings(db, portfolio.id)
    symbols = list(holdings)
    names = _names(db, [*symbols, BENCHMARK_SYMBOL])
    series = load_prices(db, symbols)
    period = common_period(series, symbols, names)
    # 2. 分析期間：預設採最大期間；指定年數時取迄日往回推的整數年
    dates, years = period["dates"], req["lookbackYears"]
    if years is not None:
        top = math.floor(period["maxYears"])
        if not MIN_YEARS <= years <= top:
            raise invalid(f"分析期間須介於 {MIN_YEARS} 年至 {top} 年之間，或留空代表採最大期間")
        start = dates[-1] - relativedelta(years=years)
        dates = [d for d in dates if d >= start]
    # 3. 利率：同一個值兼作無風險利率與最低可接受報酬
    rate, rate_as_of = bank_rate(db) if req["rateOption"] == "bank_average" else (0.0, None)
    # 4. 價格矩陣與目前市值權重（以期間最後一天的價格計算；買進日期不影響權重）
    prices = np.array([[series[s][d] for s in symbols] for d in dates])
    bench = np.array([series[BENCHMARK_SYMBOL][d] for d in dates])
    values = prices[-1] * np.array([float(holdings[s]) for s in symbols])
    weights = values / values.sum()
    result = compute_analysis(prices, bench, weights, symbols, [names[s] for s in symbols],
                              [d.isoformat() for d in dates], rate)
    # 5. 寫入唯讀快照
    row = AnalysisResult(
        user_id=user.id, portfolio_id=portfolio.id, risk_profile_id=profile.id,
        requested_years=years, max_years=Decimal(str(period["maxYears"])),
        start_date=dates[0], end_date=dates[-1], trading_days=len(dates), limited_by=period["limitedBy"],
        benchmark_symbol=BENCHMARK_SYMBOL, rate_option=req["rateOption"],
        risk_free_rate=Decimal(str(round(rate, 6))), rate_as_of=rate_as_of, mar=Decimal(str(round(rate, 6))),
        profile_inputs=req["profileInputs"], metrics=result["metrics"], positions=result["positions"],
        correlation=result["correlation"], interpretation=result["interpretation"], diagnosis=result["diagnosis"],
        figures=result["figures"], data_quality=result["dataQuality"],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_owned_analysis(db: Session, user: User, analysis_id: int) -> AnalysisResult:
    # 【取得自己的分析】不存在回 404、屬於他人回 403。參數：db=資料庫連線、user=目前登入者、analysis_id=分析編號
    row = db.get(AnalysisResult, analysis_id)
    if row is None:
        raise ApiError(404, "NOT_FOUND", "找不到這筆分析")
    if row.user_id != user.id:
        raise ApiError(403, "FORBIDDEN_RESOURCE", "無權存取這筆分析")
    return row


def history(db: Session, portfolio_id: int, page: int, page_size: int) -> dict:
    # 【歷史分析清單】依建立時間由新到舊分頁。參數：db=資料庫連線、portfolio_id=組合編號、page=頁碼（從 1 起）、page_size=每頁筆數
    if page < 1 or not 1 <= page_size <= HISTORY_PAGE_SIZE_MAX:
        raise invalid(f"頁碼須從 1 起，每頁 1～{HISTORY_PAGE_SIZE_MAX} 筆")
    base = select(AnalysisResult).where(AnalysisResult.portfolio_id == portfolio_id)
    total = db.scalar(select(func.count()).select_from(base.subquery()))
    rows = db.scalars(base.order_by(AnalysisResult.created.desc(), AnalysisResult.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [{
        "id": r.id, "created": iso(r.created), "requestedYears": r.requested_years,
        "startDate": r.start_date.isoformat(), "endDate": r.end_date.isoformat(), "tradingDays": r.trading_days,
        "rateOption": r.rate_option,
        **{k: r.metrics[k]["value"] for k in ("annualized_volatility", "max_drawdown", "sharpe_ratio")},
    } for r in rows]
    return {"items": items, "page": page, "page_size": page_size, "total": total}


def iso(dt) -> str:
    # 【時間轉字串】UTC 時間轉成帶 Z 的 ISO 8601。參數：dt=時間
    return dt.isoformat().replace("+00:00", "Z")


def serialize(row: AnalysisResult) -> dict:
    # 【快照轉回應】把資料庫的一列轉成契約的 AnalysisResult 格式。參數：row=分析結果
    return {
        "id": row.id, "portfolioId": row.portfolio_id, "riskProfileId": row.risk_profile_id,
        "period": {
            "requestedYears": row.requested_years, "maxYears": float(row.max_years),
            "startDate": row.start_date.isoformat(), "endDate": row.end_date.isoformat(), "tradingDays": row.trading_days,
            "limitedBySymbols": row.limited_by, "annualizationBasis": 252, "weightingMethod": "current_market_value",
            "benchmarkSymbol": row.benchmark_symbol,
        },
        "settings": {"rateOption": row.rate_option, "riskFreeRate": float(row.risk_free_rate), "mar": float(row.mar),
                     "rateAsOf": iso(row.rate_as_of) if row.rate_as_of else None},
        "profileInputs": row.profile_inputs, "metrics": row.metrics, "positions": row.positions,
        "correlation": row.correlation, "interpretation": row.interpretation, "diagnosis": row.diagnosis,
        "figures": row.figures, "dataQuality": row.data_quality, "created": iso(row.created),
    }
