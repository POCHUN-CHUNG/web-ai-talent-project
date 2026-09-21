import io
import logging
import re
from datetime import datetime, timezone

import pandas as pd
import requests
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import StockInfo
from app.services.n8n_result import with_retry

logger = logging.getLogger(__name__)

# ── 抓取設定 ──
# 證交所 ISIN 分類表的四組條件（市場代碼, 證券類別）：上市普通股（含 KY）、上櫃普通股、上市 ETF、上櫃 ETF
ISIN_TARGETS = [(1, 1), (2, 4), (1, "I"), (2, 3)]
ISIN_URL = "https://isin.twse.com.tw/isin/class_main.jsp?market={market}&issuetype={issuetype}"
# 代號白名單：4 碼普通股（1000～9999）或 00 開頭的 ETF（含 00981A 這類帶字尾者），排除特別股與權證
SYMBOL_PATTERN = re.compile(r"^([1-9]\d{3}|00\d{2,3}[A-Za-z]?)$")
# 大盤指數（市場基準）也收錄在股票基本資料表，讓日收盤價能對應到代號
BENCHMARK_ROW = {"symbol": "IR0001", "name": "加權報酬指數", "market": "指數", "industry": "大盤"}
ETF_INDUSTRY = "ETF"  # ETF 在證交所表格沒有產業別，統一補上這個值（規格要求 ETF 也要有產業別）
UPSERT_CHUNK = 1000  # 每次寫入資料庫的最大筆數


def _fetch_one_table(market: int, issuetype: int | str) -> pd.DataFrame:
    # 【抓一張分類表】向證交所抓單一分類的表格並轉成資料表；網頁異常時丟出錯誤，交給重試機制。
    # 參數：market=市場代碼、issuetype=證券類別代碼
    url = ISIN_URL.format(market=market, issuetype=issuetype)
    res = requests.get(url, timeout=15)
    res.raise_for_status()
    # 代號欄強制當文字讀，避免 0050 被讀成數字 50 而掉了開頭的 0
    tables = pd.read_html(io.StringIO(res.text), header=[0], converters={"有價證券代號": str})
    df = tables[0]
    # 欄位不齊代表網頁改版或被擋（回傳的不是表格），視為失敗而不是空資料
    required = {"有價證券代號", "有價證券名稱", "市場別", "產業別"}
    if not required.issubset(df.columns) or df.empty:
        raise ValueError(f"證交所表格格式異常（market={market}, issuetype={issuetype}）")
    return df


def fetch_stock_info() -> list[dict]:
    # 【抓取股票基本資料】抓四張分類表、只留白名單代號、補上大盤指數，回傳可直接寫入資料庫的清單。
    # 任何一張表重試後仍失敗就整批失敗（不回傳殘缺清單，避免悄悄少了整個市場）。無參數。
    # 1. 逐張抓取（每張失敗自動重試）
    frames = []
    for market, issuetype in ISIN_TARGETS:
        frames.append(
            with_retry(
                lambda m=market, i=issuetype: _fetch_one_table(m, i),
                f"ISIN market={market} issuetype={issuetype}",
                logger,
            )
        )
    df = pd.concat(frames, ignore_index=True)

    # 2. 取出需要的欄位並清掉前後空白（空值先轉成空字串，避免變成 "nan" 文字）
    rows = []
    seen = set()
    for _, r in df.iterrows():
        symbol = str(r["有價證券代號"]).strip()
        if not SYMBOL_PATTERN.fullmatch(symbol) or symbol in seen:
            continue  # 不在白名單或重複的代號略過
        seen.add(symbol)
        industry = "" if pd.isna(r["產業別"]) else str(r["產業別"]).strip()
        rows.append(
            {
                "symbol": symbol,
                "name": str(r["有價證券名稱"]).strip()[:40],  # 資料表欄位最長 40 字
                "market": str(r["市場別"]).strip(),
                "industry": (industry or ETF_INDUSTRY)[:40],
            }
        )

    # 3. 只接受「上市」「上櫃」；市場別若不在其中代表網頁內容異常，整批視為失敗
    bad = [x["symbol"] for x in rows if x["market"] not in ("上市", "上櫃")]
    if bad or not rows:
        raise ValueError(f"股票基本資料內容異常（市場別不明的代號：{bad[:5]}）")

    # 4. 附加大盤指數
    rows.append(dict(BENCHMARK_ROW))
    return rows


def save_stock_info(db: Session, rows: list[dict]) -> int:
    # 【寫入股票基本資料】以代號為依據：資料庫沒有就新增，已有就覆寫名稱、市場別、產業別與更新時間。
    # 只新增與更新、不刪除（下市股票若被使用者持有，紀錄必須保留）。回傳寫入筆數。
    # 參數：db=資料庫連線、rows=fetch_stock_info 回傳的清單
    # 1. 整批放在同一次提交：任何一步失敗就整批復原
    now = datetime.now(timezone.utc)
    try:
        for i in range(0, len(rows), UPSERT_CHUNK):
            chunk = [{**r, "updated": now} for r in rows[i : i + UPSERT_CHUNK]]
            stmt = insert(StockInfo).values(chunk)
            # 2. 代號重複時改成覆寫
            stmt = stmt.on_conflict_do_update(
                index_elements=["symbol"],
                set_={
                    "name": stmt.excluded.name,
                    "market": stmt.excluded.market,
                    "industry": stmt.excluded.industry,
                    "updated": stmt.excluded.updated,
                },
            )
            db.execute(stmt)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return len(rows)
