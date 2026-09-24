import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import DailyQuote, HoldingLot, Portfolio, StockInfo, User

# 【投資組合資料存取與驗證】所有權檢查、上限檢查、輸入驗證與查詢最新報價；純計算在 services/portfolio.py。

MAX_PORTFOLIOS = 20  # 每位使用者最多的組合數
MAX_SYMBOLS = 50  # 每個組合最多的不同股票檔數
MAX_LOTS_PER_SYMBOL = 100  # 同一檔股票最多的買進紀錄筆數
NAME_MAX = 30  # 組合名稱最長字數
MIN_TRADE_DATE = date(1990, 1, 1)  # 買進日期下限
SYMBOL_RE = re.compile(r"^([1-9]\d{3}|00\d{2,3}[A-Za-z]?)$")  # 一般股票（4 碼）與 ETF（00 開頭）代號格式
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")  # 日期格式 YYYY-MM-DD
TAIPEI = ZoneInfo("Asia/Taipei")  # 台股交易日以台北時間為準
QUANTITY_INT_DIGITS = 14  # 股數整數位數上限（資料表 NUMERIC(18,4)）
LOT_FIELDS = {"tradeDate", "quantity"}  # 修改買進紀錄時允許的欄位（不得改代號；價格由系統依日期帶入，不可自填）


def today_taipei() -> date:
    # 【今日】台北時區的今日日期，作為「買進日期不得晚於今日」與持有天數的基準。無參數。
    return datetime.now(TAIPEI).date()


def invalid(message: str) -> ApiError:
    # 【輸入格式錯誤】建立 400 INVALID_INPUT 錯誤。參數：message=中文說明
    return ApiError(400, "INVALID_INPUT", message)


def parse_name(value) -> str:
    # 【驗證組合名稱】去除頭尾空白後須為 1～30 字。參數：value=使用者輸入的名稱
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= NAME_MAX:
        raise invalid(f"組合名稱須為 1～{NAME_MAX} 字")
    return value.strip()


def parse_trade_date(value) -> date:
    # 【驗證買進日期】須為 YYYY-MM-DD，且介於 1990-01-01 與今日之間。參數：value=使用者輸入的日期
    if not isinstance(value, str) or not DATE_RE.match(value):
        raise invalid("買進日期格式須為 YYYY-MM-DD")
    try:
        d = date.fromisoformat(value)
    except ValueError:
        raise invalid("買進日期不是有效的日期") from None
    if d < MIN_TRADE_DATE or d > today_taipei():
        raise invalid("買進日期須介於 1990-01-01 與今日之間")
    return d


def parse_positive(value, label: str, int_digits: int) -> Decimal:
    # 【驗證正數】須為大於 0 的有限數字，小數最多 4 位，整數位數不超過資料表上限。
    # 參數：value=使用者輸入的數字（字串或數字）、label=欄位中文名、int_digits=整數位數上限
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        raise invalid(f"{label}格式不正確")
    try:
        d = Decimal(str(value).strip())
    except InvalidOperation:
        raise invalid(f"{label}格式不正確") from None
    if not d.is_finite() or d <= 0:
        raise invalid(f"{label}須大於 0")
    if d.normalize().as_tuple().exponent < -4:
        raise invalid(f"{label}小數最多 4 位")
    if d >= Decimal(10) ** int_digits:
        raise invalid(f"{label}數值過大")
    return d


def parse_symbol(value) -> str:
    # 【驗證代號格式】符合白名單格式，英文字母一律轉大寫。參數：value=使用者輸入的代號
    if not isinstance(value, str) or not SYMBOL_RE.match(value.strip()):
        raise invalid("股票代號格式不正確")
    return value.strip().upper()


def get_owned_portfolio(db: Session, user: User, portfolio_id: int, lock: bool = False) -> Portfolio:
    # 【取得自己的組合】不存在回 404、屬於別人回 403。
    # 參數：db=資料庫連線、user=目前登入者、portfolio_id=組合編號、lock=True 時鎖定該列（新增／修改前用，避免同時操作繞過上限）
    stmt = select(Portfolio).where(Portfolio.id == portfolio_id)
    p = db.scalar(stmt.with_for_update() if lock else stmt)
    if p is None:
        raise ApiError(404, "NOT_FOUND", "找不到這個投資組合")
    if p.user_id != user.id:
        raise ApiError(403, "FORBIDDEN_RESOURCE", "無權存取這個投資組合")
    return p


def lock_user(db: Session, user: User) -> None:
    # 【鎖定使用者】新增組合前先鎖住該使用者的列，避免同時兩個請求都通過「組合數上限」檢查。參數：db=資料庫連線、user=目前登入者
    db.execute(select(User.id).where(User.id == user.id).with_for_update())


def check_portfolio_limit(db: Session, user: User) -> None:
    # 【檢查組合數上限】已有 20 個組合時回 422 LIMIT_EXCEEDED。參數：db=資料庫連線、user=目前登入者
    n = db.scalar(select(func.count()).select_from(Portfolio).where(Portfolio.user_id == user.id))
    if n >= MAX_PORTFOLIOS:
        raise ApiError(422, "LIMIT_EXCEEDED", f"每位使用者最多 {MAX_PORTFOLIOS} 個投資組合")


def check_lot_limits(db: Session, portfolio_id: int, symbol: str) -> None:
    # 【檢查買進紀錄上限】新股票超過 50 檔、或同一檔已有 100 筆，回 422 LIMIT_EXCEEDED。
    # 參數：db=資料庫連線、portfolio_id=組合編號、symbol=要新增的代號
    same = db.scalar(
        select(func.count()).select_from(HoldingLot).where(HoldingLot.portfolio_id == portfolio_id, HoldingLot.symbol == symbol)
    )
    if same >= MAX_LOTS_PER_SYMBOL:
        raise ApiError(422, "LIMIT_EXCEEDED", f"同一檔股票最多 {MAX_LOTS_PER_SYMBOL} 筆買進紀錄")
    if same == 0:  # 這檔是新股票，才需要檢查檔數上限
        kinds = db.scalar(
            select(func.count(func.distinct(HoldingLot.symbol))).where(HoldingLot.portfolio_id == portfolio_id)
        )
        if kinds >= MAX_SYMBOLS:
            raise ApiError(422, "LIMIT_EXCEEDED", f"每個組合最多 {MAX_SYMBOLS} 檔不同股票")


def require_stock(db: Session, symbol: str) -> StockInfo:
    # 【確認股票可買進】代號須存在於股票基本資料，且不是大盤指數。參數：db=資料庫連線、symbol=代號
    s = db.get(StockInfo, symbol)
    if s is None:
        raise ApiError(404, "NOT_FOUND", "找不到這個股票代號")
    if s.market == "指數":
        raise invalid("大盤指數不可作為持股")
    return s


def load_market(db: Session, lots: list) -> tuple[dict, dict]:
    # 【查名稱與最新報價】為這批買進紀錄的代號查股票名稱，以及每檔最新一筆還原收盤價與其日期（沒有報價的代號不會出現在結果中）。
    # 參數：db=資料庫連線、lots=買進紀錄清單；回傳 (代號→名稱, 代號→(最新價, 價格日期))
    symbols = {x.symbol for x in lots}
    if not symbols:
        return {}, {}
    names = dict(db.execute(select(StockInfo.symbol, StockInfo.name).where(StockInfo.symbol.in_(symbols))).all())
    rows = db.execute(
        select(DailyQuote.symbol, DailyQuote.adj_close, DailyQuote.trade_date)
        .where(DailyQuote.symbol.in_(symbols))
        .distinct(DailyQuote.symbol)
        .order_by(DailyQuote.symbol, DailyQuote.trade_date.desc())
    ).all()
    return names, {sym: (px, d) for sym, px, d in rows}


def load_previous_prices(db: Session, symbols: set) -> dict:
    # 【查前一日收盤價】為這批代號各查「最新一筆」之前的前一筆還原收盤價，用來算「最新日損益」（沒有前一筆資料的代號不會出現在結果中）。
    # 參數：db=資料庫連線、symbols=代號集合；回傳 代號→前一日收盤價
    if not symbols:
        return {}
    ranked = (
        select(
            DailyQuote.symbol,
            DailyQuote.adj_close,
            func.row_number().over(partition_by=DailyQuote.symbol, order_by=DailyQuote.trade_date.desc()).label("rn"),
        )
        .where(DailyQuote.symbol.in_(symbols))
        .subquery()
    )
    rows = db.execute(select(ranked.c.symbol, ranked.c.adj_close).where(ranked.c.rn == 2)).all()
    return dict(rows)


def close_on_date(db: Session, symbol: str, d: date) -> Decimal:
    # 【查買進日收盤價】取該檔在指定日期當天的還原收盤價；該日沒有資料（假日、休市、尚未有資料）就回 422 INSUFFICIENT_PRICE_DATA，不往前遞補。
    # 參數：db=資料庫連線、symbol=代號、d=買進日期；回傳收盤價
    px = db.scalar(select(DailyQuote.adj_close).where(DailyQuote.symbol == symbol, DailyQuote.trade_date == d))
    if px is None:
        raise ApiError(422, "INSUFFICIENT_PRICE_DATA", "這檔股票在該日期沒有收盤價資料（可能是休市日），請改選有資料的日期")
    return px


def trading_dates(db: Session, symbol: str) -> list[date]:
    # 【有資料的日期】該檔股票所有有收盤價的日期，由舊到新；供買進日期選擇器只開放這些日期。參數：db=資料庫連線、symbol=代號
    return list(db.scalars(select(DailyQuote.trade_date).where(DailyQuote.symbol == symbol).order_by(DailyQuote.trade_date)).all())
