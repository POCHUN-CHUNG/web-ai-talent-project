import logging
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import ApiError
from app.models import StockInfo, User
from app.security import current_user, require_n8n_key
from app.services.portfolio_data import close_on_date, parse_symbol, parse_trade_date, require_stock, trading_dates
from app.services.n8n_result import fail_error, ok_result
from app.services.stock_info import fetch_stock_info, save_stock_info

logger = logging.getLogger(__name__)

MESSAGE = "抓取上市櫃股票基本資料"  # 抓取訊息（只寫做什麼；成功或失敗由 status 顯示）

# 【股票基本資料 API】網址開頭皆為 /stocks
router = APIRouter(prefix="/stocks", tags=["股票基本資料"])


SEARCH_LIMIT_DEFAULT = 20  # 搜尋結果預設筆數
SEARCH_LIMIT_MAX = 50  # 搜尋結果筆數上限


@router.get("", summary="以代號或名稱搜尋股票（需登入，不含大盤指數）")
def search_stocks(q: str = "", limit: int = SEARCH_LIMIT_DEFAULT, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【搜尋股票】同時比對代號開頭與名稱中的文字，供新增買進紀錄時挑選；大盤指數不會出現。
    # 參數：q=搜尋文字（至少 1 字）、limit=最多幾筆（1～50）、user=目前登入者
    # 1. 驗證參數
    q = q.strip()
    if not q or not 1 <= limit <= SEARCH_LIMIT_MAX:
        raise ApiError(400, "INVALID_INPUT", f"請輸入至少 1 字的搜尋文字，筆數限 1～{SEARCH_LIMIT_MAX}")
    # 2. 代號開頭或名稱包含（autoescape：把 % 與 _ 當一般字元，不當萬用字元）
    rows = db.scalars(
        select(StockInfo)
        .where(
            StockInfo.market != "指數",
            StockInfo.symbol.istartswith(q, autoescape=True) | StockInfo.name.icontains(q, autoescape=True),
        )
        .order_by(StockInfo.symbol)
        .limit(limit)
    ).all()
    return {"items": [{"symbol": r.symbol, "name": r.name, "market": r.market, "industry": r.industry} for r in rows]}


@router.get("/{symbol}/close", summary="查詢某股票在指定日期的還原收盤價（需登入）")
def close_price(symbol: str, date: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【查收盤價】新增買進紀錄時，選好日期後顯示系統將帶入的每股價格；該日沒有資料回 422。
    # 參數：symbol=代號、date=買進日期 YYYY-MM-DD、user=目前登入者
    sym = parse_symbol(symbol)
    d = parse_trade_date(date)
    require_stock(db, sym)
    return {"symbol": sym, "date": d.isoformat(), "adjClose": str(close_on_date(db, sym, d).quantize(Decimal("0.0001")))}


@router.get("/{symbol}/trading-dates", summary="查詢某股票有收盤價資料的所有日期（需登入）")
def stock_trading_dates(symbol: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【有資料的日期】買進日期選擇器只開放這些日期（假日、休市日與沒資料的日子不可選）。參數：symbol=代號、user=目前登入者
    sym = parse_symbol(symbol)
    require_stock(db, sym)
    dates = [d.isoformat() for d in trading_dates(db, sym)]
    return {"symbol": sym, "dates": dates}


@router.post(
    "/fetch",
    summary="抓取上市櫃股票與 ETF 基本資料並存入資料庫（僅限 n8n，需標頭 X-API-Key）",
    dependencies=[Depends(require_n8n_key)],
)
def fetch(db: Session = Depends(get_db)):
    # 【抓取並儲存股票基本資料】從證交所取得代號、名稱、市場別、產業別（含大盤指數 IR0001），已存在的代號直接覆寫。僅 n8n 可呼叫。
    # 1. 抓取（每張表失敗會自動重試）；任何一張最終失敗就回 502，且不寫入任何資料
    try:
        rows = fetch_stock_info()
    except Exception as exc:
        logger.exception("fetch_stock_info failed")
        raise fail_error(502, MESSAGE, f"{type(exc).__name__}: {exc}"[:300]) from exc

    # 2. 寫入（同一次提交，失敗就復原）；只新增與覆寫，不刪除任何既有代號
    try:
        saved = save_stock_info(db, rows)
    except Exception as exc:
        logger.exception("save stock_info failed")
        raise fail_error(
            500, "股票基本資料存入資料庫", "基本資料已抓取，但存入資料庫失敗", fail_count=len(rows)
        ) from exc

    # 3. 回傳統一的 n8n 欄位
    return ok_result(MESSAGE, success_count=saved, fail_count=0)
