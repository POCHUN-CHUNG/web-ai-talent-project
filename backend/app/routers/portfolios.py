from collections import defaultdict

from fastapi import APIRouter, Body, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import ApiError
from app.models import HoldingLot, Portfolio, User
from app.security import current_user
from app.services.portfolio import build_detail, build_lot, build_positions, build_totals
from app.services.portfolio_data import (
    LOT_FIELDS,
    QUANTITY_INT_DIGITS,
    check_lot_limits,
    check_portfolio_limit,
    close_on_date,
    get_owned_portfolio,
    invalid,
    load_market,
    lock_user,
    parse_name,
    parse_positive,
    parse_symbol,
    parse_trade_date,
    require_stock,
    today_taipei,
)

# 【投資組合與買進紀錄 API】組合的新增、查詢、改名、刪除，以及買進紀錄的新增、修改、刪除；全部需登入，且只能操作自己的資料
router = APIRouter(prefix="/portfolios", tags=["投資組合"])


def iso(dt) -> str:
    # 【時間轉字串】UTC 時間轉成帶 Z 的 ISO 8601。參數：dt=時間
    return dt.isoformat().replace("+00:00", "Z")


def serialize_portfolio(p: Portfolio) -> dict:
    # 【組合轉回應】把資料庫的一列轉成契約的 Portfolio 格式。參數：p=投資組合
    return {"id": p.id, "name": p.name, "created": iso(p.created), "updated": iso(p.updated)}


def get_lot(db: Session, portfolio_id: int, lot_id: int) -> HoldingLot:
    # 【取得買進紀錄】須屬於指定組合，否則回 404。參數：db=資料庫連線、portfolio_id=組合編號、lot_id=買進紀錄編號
    lot = db.scalar(select(HoldingLot).where(HoldingLot.id == lot_id, HoldingLot.portfolio_id == portfolio_id))
    if lot is None:
        raise ApiError(404, "NOT_FOUND", "找不到這筆買進紀錄")
    return lot


@router.get("", summary="取得自己的投資組合清單與各組合損益摘要（需登入）")
def list_portfolios(user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【組合清單】依建立時間由新到舊回傳，每個組合含持股檔數、市值、未實現損益與報酬率、最新價格日期、最近分析時間。參數：user=目前登入者
    # 1. 一次取出全部組合與其買進紀錄，再一次查最新報價（避免每個組合各查一次）
    portfolios = db.scalars(select(Portfolio).where(Portfolio.user_id == user.id).order_by(Portfolio.created.desc(), Portfolio.id.desc())).all()
    lots = db.scalars(select(HoldingLot).where(HoldingLot.portfolio_id.in_([p.id for p in portfolios]))).all() if portfolios else []
    names, prices = load_market(db, lots)
    by_pf = defaultdict(list)
    for lot in lots:
        by_pf[lot.portfolio_id].append(lot)
    # 2. 每個組合各自彙總
    today = today_taipei()
    items = []
    for p in portfolios:
        positions = build_positions(by_pf[p.id], names, prices, today)
        totals = build_totals(positions, today)
        dates = [x["latestPriceDate"] for x in positions if x["latestPriceDate"]]
        items.append({
            **serialize_portfolio(p),
            "symbolCount": len(positions),
            "costAmount": totals["costAmount"],
            "marketValue": totals["marketValue"],
            "unrealizedPnl": totals["unrealizedPnl"],
            "unrealizedReturn": totals["unrealizedReturn"],
            "latestPriceDate": max(dates) if dates else None,
            "lastAnalysisAt": None,  # 量化分析尚未實作，之後改為最近一次分析的時間
        })
    return {"items": items}


@router.post("", status_code=201, summary="新增投資組合（需登入）")
def create_portfolio(body: dict = Body(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【新增組合】名稱 1～30 字、同一使用者不可重複，每人最多 20 個。參數：body={name}、user=目前登入者
    # 1. 驗證名稱
    name = parse_name(body.get("name"))
    # 2. 鎖住使用者後檢查組合數上限，避免同時送出多個請求繞過
    lock_user(db, user)
    check_portfolio_limit(db, user)
    if db.scalar(select(Portfolio.id).where(Portfolio.user_id == user.id, Portfolio.name == name)):
        raise ApiError(409, "PORTFOLIO_NAME_TAKEN", "已有同名的投資組合")
    # 3. 寫入；資料庫的唯一限制是最後一道防線
    p = Portfolio(user_id=user.id, name=name)
    db.add(p)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "PORTFOLIO_NAME_TAKEN", "已有同名的投資組合") from None
    db.refresh(p)
    return serialize_portfolio(p)


@router.get("/{portfolio_id}", summary="取得單一投資組合的持股部位、買進紀錄與損益（需登入）")
def get_portfolio(portfolio_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【組合明細】回傳依市值排序的持股部位（每檔含其全部買進紀錄）與總覽。參數：portfolio_id=組合編號、user=目前登入者
    p = get_owned_portfolio(db, user, portfolio_id)
    lots = db.scalars(select(HoldingLot).where(HoldingLot.portfolio_id == p.id)).all()
    names, prices = load_market(db, lots)
    return {**serialize_portfolio(p), **build_detail(lots, names, prices, today_taipei())}


@router.patch("/{portfolio_id}", summary="修改投資組合名稱（需登入）")
def rename_portfolio(portfolio_id: int, body: dict = Body(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【組合改名】只能改名稱。參數：portfolio_id=組合編號、body={name}、user=目前登入者
    if set(body) != {"name"}:
        raise invalid("只能修改 name")
    name = parse_name(body["name"])
    p = get_owned_portfolio(db, user, portfolio_id, lock=True)
    if name != p.name:
        if db.scalar(select(Portfolio.id).where(Portfolio.user_id == user.id, Portfolio.name == name, Portfolio.id != p.id)):
            raise ApiError(409, "PORTFOLIO_NAME_TAKEN", "已有同名的投資組合")
        p.name = name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "PORTFOLIO_NAME_TAKEN", "已有同名的投資組合") from None
    db.refresh(p)
    return serialize_portfolio(p)


@router.delete("/{portfolio_id}", status_code=204, summary="刪除投資組合與其全部買進紀錄（需登入）")
def delete_portfolio(portfolio_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【刪除組合】組合底下的買進紀錄由資料庫連帶刪除。參數：portfolio_id=組合編號、user=目前登入者
    p = get_owned_portfolio(db, user, portfolio_id, lock=True)
    db.delete(p)
    db.commit()


@router.post("/{portfolio_id}/holding-lots", status_code=201, summary="新增一筆買進紀錄（需登入）")
def add_lot(portfolio_id: int, body: dict = Body(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【新增買進紀錄】輸入代號、買進日期、股數；每股價格自動帶入當天還原收盤價；同一檔可有多筆。參數：portfolio_id=組合編號、body={symbol, tradeDate, quantity}、user=目前登入者
    # 1. 驗證輸入格式（不查資料庫）；價格不可自填，由系統依買進日帶入
    if set(body) != {"symbol", "tradeDate", "quantity"}:
        raise invalid("須提供 symbol、tradeDate、quantity 三個欄位（價格由系統依日期帶入）")
    symbol = parse_symbol(body["symbol"])
    trade_date = parse_trade_date(body["tradeDate"])
    quantity = parse_positive(body["quantity"], "股數", QUANTITY_INT_DIGITS)
    # 2. 確認組合屬於自己（同時鎖定，避免同時新增繞過上限）、股票存在且不是指數、未超過上限
    p = get_owned_portfolio(db, user, portfolio_id, lock=True)
    require_stock(db, symbol)
    check_lot_limits(db, p.id, symbol)
    # 3. 每股價格 = 買進日當天的還原收盤價（該日沒有資料就拒絕）
    unit_cost = close_on_date(db, symbol, trade_date)
    # 4. 寫入
    lot = HoldingLot(portfolio_id=p.id, symbol=symbol, trade_date=trade_date, quantity=quantity, unit_cost=unit_cost)
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return build_lot(lot, None, today_taipei())


@router.patch("/{portfolio_id}/holding-lots/{lot_id}", summary="修改一筆買進紀錄的日期或股數（需登入）")
def update_lot(portfolio_id: int, lot_id: int, body: dict = Body(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【修改買進紀錄】只可改 tradeDate、quantity；改日期時價格重新帶入新日期的收盤價；不可改代號與價格。
    # 參數：portfolio_id=組合編號、lot_id=買進紀錄編號、body=要修改的欄位、user=目前登入者
    # 1. 驗證欄位：至少一個、不得有其他欄位（含 symbol、unitCost）
    if not body or not set(body) <= LOT_FIELDS:
        raise invalid("只能修改 tradeDate、quantity，且至少提供一項")
    parsed = {}
    if "tradeDate" in body:
        parsed["trade_date"] = parse_trade_date(body["tradeDate"])
    if "quantity" in body:
        parsed["quantity"] = parse_positive(body["quantity"], "股數", QUANTITY_INT_DIGITS)
    # 2. 確認組合與紀錄屬於自己；日期有改時，每股價格一併改為新日期的收盤價
    get_owned_portfolio(db, user, portfolio_id, lock=True)
    lot = get_lot(db, portfolio_id, lot_id)
    if "trade_date" in parsed and parsed["trade_date"] != lot.trade_date:
        parsed["unit_cost"] = close_on_date(db, lot.symbol, parsed["trade_date"])
    for k, v in parsed.items():
        setattr(lot, k, v)
    db.commit()
    db.refresh(lot)
    return build_lot(lot, None, today_taipei())


@router.delete("/{portfolio_id}/holding-lots/{lot_id}", status_code=204, summary="刪除一筆買進紀錄（需登入）")
def delete_lot(portfolio_id: int, lot_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【刪除買進紀錄】參數：portfolio_id=組合編號、lot_id=買進紀錄編號、user=目前登入者
    get_owned_portfolio(db, user, portfolio_id, lock=True)
    db.delete(get_lot(db, portfolio_id, lot_id))
    db.commit()
