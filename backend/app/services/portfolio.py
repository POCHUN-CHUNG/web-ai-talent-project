from collections import defaultdict
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

# 【投資組合計算】把買進紀錄即時彙總成持股部位、加權平均成本、未實現損益與年化持有報酬（不落表）。
# 只做純計算，不連資料庫、不呼叫外部服務；金額一律用 Decimal，比例才用 float。損益未納入手續費與交易稅。

MONEY = Decimal("0.0001")  # 金額與價格顯示到小數 4 位
MIN_ANNUALIZE_DAYS = 30  # 持有天數未滿 30 日不年化（短期報酬年化會產生誤導性的大數字）
PRICE_DISCLAIMER = "未納入手續費與交易稅"  # 凡顯示損益處固定附註


def money(x: Decimal) -> str:
    # 【金額轉字串】四捨五入到小數 4 位並轉成字串，避免浮點誤差。參數：x=金額
    return str(x.quantize(MONEY, ROUND_HALF_UP))


def ratio(x: Decimal) -> float:
    # 【比例轉數字】把 Decimal 比例（如報酬率、權重）取到小數 6 位。參數：x=比例
    return float(x.quantize(Decimal("0.000001"), ROUND_HALF_UP))


def annualized_return(unrealized_return: Decimal, holding_days: int) -> float | None:
    # 【年化持有報酬率】(1+未實現報酬率)^(365/持有天數)−1；持有天數未滿 30 日回 None（不年化）。
    # 參數：unrealized_return=未實現報酬率、holding_days=持有天數
    if holding_days < MIN_ANNUALIZE_DAYS:
        return None
    try:
        return round((1 + float(unrealized_return)) ** (365 / holding_days) - 1, 6)
    except (OverflowError, ZeroDivisionError):
        return None  # 數字大到無法表示時視為不可年化


def weighted_days(items: list[tuple[Decimal, int]]) -> int:
    # 【加權平均持有天數】以投入成本加權的平均持有日曆天數，四捨五入成整數；沒有資料回 0。
    # 參數：items=每筆 (投入成本, 持有天數)
    total = sum((c for c, _ in items), Decimal(0))
    if total == 0:
        return 0
    return int((sum((c * d for c, d in items), Decimal(0)) / total).quantize(Decimal(1), ROUND_HALF_UP))


def build_lot(lot, price: Decimal | None, today: date) -> dict:
    # 【單筆買進紀錄】回傳該筆資料加上成本、市值、損益、報酬率與持有天數（無報價時市值與損益為 None）。
    # 參數：lot=買進紀錄、price=該檔最新價（無報價為 None）、today=今日
    cost = lot.quantity * lot.unit_cost
    value = lot.quantity * price if price is not None else None
    return {
        "id": lot.id,
        "portfolioId": lot.portfolio_id,
        "symbol": lot.symbol,
        "tradeDate": lot.trade_date.isoformat(),
        "quantity": money(lot.quantity),
        "unitCost": money(lot.unit_cost),
        "costAmount": money(cost),
        "marketValue": money(value) if value is not None else None,
        "unrealizedPnl": money(value - cost) if value is not None else None,
        "unrealizedReturn": ratio((value - cost) / cost) if value is not None else None,
        "holdingDays": max((today - lot.trade_date).days, 0),
        "created": lot.created.isoformat().replace("+00:00", "Z"),
        "updated": lot.updated.isoformat().replace("+00:00", "Z"),
    }


def build_positions(lots: list, names: dict, prices: dict, today: date) -> list[dict]:
    # 【彙總持股部位】依代號把買進紀錄彙總成每檔一列，並算出權重；依市值由大到小排序。
    # 參數：lots=買進紀錄清單、names=代號→名稱、prices=代號→(最新價, 價格日期)、today=今日
    # 1. 依代號分組，每組內依買進日期、編號排序
    groups: dict[str, list] = defaultdict(list)
    for lot in sorted(lots, key=lambda x: (x.trade_date, x.id)):
        groups[lot.symbol].append(lot)

    positions = []
    for symbol, items in groups.items():
        price, price_date = prices.get(symbol, (None, None))
        # 2. 股數、投入成本、加權平均成本 = 投入成本 ÷ 股數
        qty = sum((x.quantity for x in items), Decimal(0))
        cost = sum((x.quantity * x.unit_cost for x in items), Decimal(0))
        # 3. 市值與損益（無最新報價時標為不可用 None）
        value = qty * price if price is not None else None
        ret = (value - cost) / cost if value is not None else None
        day_items = [(x.quantity * x.unit_cost, max((today - x.trade_date).days, 0)) for x in items]
        days = weighted_days(day_items)
        positions.append({
            "symbol": symbol,
            "name": names.get(symbol, symbol),
            "quantity": money(qty),
            "averageCost": money(cost / qty),
            "costAmount": money(cost),
            "latestPrice": money(price) if price is not None else None,
            "latestPriceDate": price_date.isoformat() if price_date else None,
            "marketValue": money(value) if value is not None else None,
            "unrealizedPnl": money(value - cost) if value is not None else None,
            "unrealizedReturn": ratio(ret) if ret is not None else None,
            "holdingDays": days,
            "annualizedReturn": annualized_return(ret, days) if ret is not None else None,
            "weight": None,
            "lots": [build_lot(x, price, today) for x in items],
            "_value": value,
            "_cost": cost,
            "_day_items": day_items,
        })

    # 4. 權重 = 該檔市值 ÷ 全部市值；只要有一檔沒報價，權重加總就不是 1，全部標為不可用
    complete = all(p["_value"] is not None for p in positions)
    total_value = sum((p["_value"] for p in positions), Decimal(0)) if complete else None
    for p in positions:
        if total_value:
            p["weight"] = ratio(p["_value"] / total_value)
    # 5. 排序：有市值者依市值由大到小，其餘依投入成本，無報價者排最後
    positions.sort(key=lambda p: (p["_value"] is None, -(p["_value"] if p["_value"] is not None else p["_cost"])))
    return positions


def build_totals(positions: list[dict], today: date) -> dict:
    # 【組合總覽】把全部部位加總：投入成本、市值、未實現損益、報酬率、持有天數、年化報酬。
    # 只要有一檔沒報價，市值與損益相關數字一律為 None（不拿不完整的資料相加）。參數：positions=持股部位、today=今日
    cost = sum((p["_cost"] for p in positions), Decimal(0))
    days = weighted_days([item for p in positions for item in p["_day_items"]])
    complete = all(p["_value"] is not None for p in positions)
    value = sum((p["_value"] for p in positions), Decimal(0)) if complete else None
    ret = (value - cost) / cost if value is not None and cost > 0 else None
    return {
        "costAmount": money(cost),
        "marketValue": money(value) if value is not None else None,
        "unrealizedPnl": money(value - cost) if value is not None else None,
        "unrealizedReturn": ratio(ret) if ret is not None else None,
        "holdingDays": days,
        "annualizedReturn": annualized_return(ret, days) if ret is not None else None,
    }


def strip_private(positions: list[dict]) -> list[dict]:
    # 【移除內部欄位】去掉計算用的底線欄位（_value、_cost、_day_items）後才可回傳。參數：positions=持股部位
    return [{k: v for k, v in p.items() if not k.startswith("_")} for p in positions]


def build_detail(lots: list, names: dict, prices: dict, today: date) -> dict:
    # 【組合明細內容】回傳持股部位、總覽與最新價格日期。
    # 參數：lots=買進紀錄、names=代號→名稱、prices=代號→(最新價, 價格日期)、today=今日
    positions = build_positions(lots, names, prices, today)
    totals = build_totals(positions, today)
    dates = [p["latestPriceDate"] for p in positions if p["latestPriceDate"]]
    return {
        "positions": strip_private(positions),
        "totals": totals,
        "priceDisclaimer": PRICE_DISCLAIMER,
        "latestPriceDate": max(dates) if dates else None,
    }
