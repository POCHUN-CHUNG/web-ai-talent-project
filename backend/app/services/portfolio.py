from collections import defaultdict
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

# 【投資組合計算】把買進紀錄即時彙總成持股部位、加權平均成本、未實現損益與年化持有報酬（不落表）。
# 只做純計算，不連資料庫、不呼叫外部服務；金額一律用 Decimal，比例才用 float。損益未納入手續費與交易稅。

MONEY = Decimal("0.0001")  # 金額與價格顯示到小數 4 位
MIN_ANNUALIZE_DAYS = 30  # 持有天數未滿 30 日不年化（短期報酬年化會產生誤導性的大數字）
PRICE_DISCLAIMER = "未納入手續費與交易稅"  # 凡顯示損益處固定附註
UNCLASSIFIED = "未分類"  # 股票基本資料查不到產業別或市場別時的顯示文字
ETF_INDUSTRY = "ETF"  # 股票基本資料中 ETF 的產業別固定為此值（來自證交所 ISIN 的 ETF 分類表）


def money(x: Decimal) -> str:
    # 【金額轉字串】四捨五入到小數 4 位並轉成字串，避免浮點誤差。參數：x=金額
    return str(x.quantize(MONEY, ROUND_HALF_UP))


def ratio(x: Decimal) -> float:
    # 【比例轉數字】把 Decimal 比例（如報酬率、權重）取到小數 6 位。參數：x=比例
    return float(x.quantize(Decimal("0.000001"), ROUND_HALF_UP))


def annualized_return(unrealized_return: Decimal, holding_days: int) -> float | None:
    # 【年化持有報酬率】把「持有這幾天賺了多少百分比」換算成「若這個報酬率速度延續一整年，全年報酬率會是多少」，
    # 公式依據一律是投入成本（不是市值）：
    #   1. unrealized_return 本身就是以投入成本為分母算出來的報酬率：(市值 − 投入成本) ÷ 投入成本
    #   2. 換算成「持有期間的成長倍數」：growth = 1 + unrealized_return（成本 1 元變成 1+報酬率 元）
    #   3. 用複利公式往回推「若這個成長速度維持 365 天」的年化倍數：growth^(365/持有天數)
    #   4. 換回報酬率：年化報酬率 = 年化倍數 − 1
    # 持有天數未滿 30 日不年化（天數太短，年化會放大成誤導性的大數字），回 None。
    # 參數：unrealized_return=以投入成本為分母的未實現報酬率、holding_days=持有天數
    if holding_days < MIN_ANNUALIZE_DAYS:
        return None
    try:
        growth = 1 + float(unrealized_return)
        return round(growth ** (365 / holding_days) - 1, 6)
    except (OverflowError, ZeroDivisionError):
        return None  # 數字大到無法表示時視為不可年化


def security_type(industry: str | None) -> str:
    # 【有價證券別】依證交所 ISIN 分類：ETF 分類表的標的為「ETF」，普通股分類表的標的為「股票」。
    # 股票基本資料只從這兩類表格匯入，且 ETF 的產業別固定為「ETF」，因此可由產業別判斷。參數：industry=產業別
    if not industry:
        return UNCLASSIFIED
    return "ETF" if industry == ETF_INDUSTRY else "股票"


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


def build_positions(lots: list, names: dict, prices: dict, today: date, prev_prices: dict | None = None,
                    meta: dict | None = None) -> list[dict]:
    # 【彙總持股部位】依代號把買進紀錄彙總成每檔一列，並算出權重；依市值由大到小排序。
    # 參數：lots=買進紀錄清單、names=代號→名稱、prices=代號→(最新價, 價格日期)、today=今日、
    #      prev_prices=代號→前一日收盤價（沒有就當作無法算最新日損益）、
    #      meta=代號→(產業別, 市場別)（取自股票基本資料；查不到就標「未分類」）
    prev_prices = prev_prices or {}
    meta = meta or {}
    # 1. 依代號分組，每組內依買進日期、編號排序
    groups: dict[str, list] = defaultdict(list)
    for lot in sorted(lots, key=lambda x: (x.trade_date, x.id)):
        groups[lot.symbol].append(lot)

    positions = []
    for symbol, items in groups.items():
        price, price_date = prices.get(symbol, (None, None))
        prev_price = prev_prices.get(symbol)
        industry, market = meta.get(symbol, (None, None))
        # 2. 股數、投入成本、加權平均成本 = 投入成本 ÷ 股數
        qty = sum((x.quantity for x in items), Decimal(0))
        cost = sum((x.quantity * x.unit_cost for x in items), Decimal(0))
        # 3. 市值與損益（無最新報價時標為不可用 None）
        value = qty * price if price is not None else None
        ret = (value - cost) / cost if value is not None else None
        # 最新日損益 = (最新價 − 前一日收盤價) × 股數；兩個價格缺一個就不可用
        day_pnl = qty * (price - prev_price) if price is not None and prev_price is not None else None
        # 前一日市值 = 前一日收盤價 × 股數；用來當「最新日損益率」的分母（分母是前一天的市值，不是投入成本）
        prev_value = qty * prev_price if prev_price is not None else None
        day_items = [(x.quantity * x.unit_cost, max((today - x.trade_date).days, 0)) for x in items]
        days = weighted_days(day_items)
        positions.append({
            "symbol": symbol,
            "name": names.get(symbol, symbol),
            "industry": industry or UNCLASSIFIED,
            "market": market or UNCLASSIFIED,
            "securityType": security_type(industry),
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
            "_day_pnl": day_pnl,
            "_prev_value": prev_value,
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
    # 【組合總覽】把全部部位加總：投入成本、市值、未實現損益、報酬率、持有天數、年化報酬、最新日損益與其百分比。
    # 只要有一檔沒報價（或沒有前一日收盤價），對應的加總數字一律為 None（不拿不完整的資料相加）。參數：positions=持股部位、today=今日
    cost = sum((p["_cost"] for p in positions), Decimal(0))
    days = weighted_days([item for p in positions for item in p["_day_items"]])
    complete = all(p["_value"] is not None for p in positions)
    value = sum((p["_value"] for p in positions), Decimal(0)) if complete else None
    ret = (value - cost) / cost if value is not None and cost > 0 else None
    complete_day = all(p["_day_pnl"] is not None for p in positions)
    day_pnl = sum((p["_day_pnl"] for p in positions), Decimal(0)) if complete_day else None
    # 最新日損益率 = 最新日損益 ÷ 前一日總市值（分母是前一天的市值，不是投入成本，才能反映「今天比昨天漲跌了多少百分比」）
    prev_value = sum((p["_prev_value"] for p in positions), Decimal(0)) if complete_day else None
    day_pnl_pct = day_pnl / prev_value if day_pnl is not None and prev_value else None
    return {
        "costAmount": money(cost),
        "marketValue": money(value) if value is not None else None,
        "unrealizedPnl": money(value - cost) if value is not None else None,
        "unrealizedReturn": ratio(ret) if ret is not None else None,
        "holdingDays": days,
        "annualizedReturn": annualized_return(ret, days) if ret is not None else None,
        "latestDayPnl": money(day_pnl) if day_pnl is not None else None,
        "latestDayPnlPercent": ratio(day_pnl_pct) if day_pnl_pct is not None else None,
    }


def strip_private(positions: list[dict]) -> list[dict]:
    # 【移除內部欄位】去掉計算用的底線欄位（_value、_cost、_day_items）後才可回傳。參數：positions=持股部位
    return [{k: v for k, v in p.items() if not k.startswith("_")} for p in positions]


def build_detail(lots: list, names: dict, prices: dict, today: date, meta: dict | None = None, prev_prices: dict | None = None) -> dict:
    # 【組合明細內容】回傳持股部位（含產業別、市場別、有價證券別）、總覽（含最新日損益）與最新價格日期。
    # 參數：lots=買進紀錄、names=代號→名稱、prices=代號→(最新價, 價格日期)、today=今日、
    #      meta=代號→(產業別, 市場別)、prev_prices=代號→前一日收盤價
    positions = build_positions(lots, names, prices, today, prev_prices, meta)
    totals = build_totals(positions, today)
    dates = [p["latestPriceDate"] for p in positions if p["latestPriceDate"]]
    return {
        "positions": strip_private(positions),
        "totals": totals,
        "priceDisclaimer": PRICE_DISCLAIMER,
        "latestPriceDate": max(dates) if dates else None,
    }


def build_history(lots: list, quotes: list) -> list[dict]:
    # 【每日走勢】從第一筆買進日起，逐個交易日算出「當天的組合市值」、「當天為止累計投入成本」與「當天的年化報酬率」，
    # 給走勢圖與總覽卡片的迷你趨勢圖用。年化報酬率算法與總覽相同（以投入成本加權的平均持有天數，未滿 30 日為 None）。
    # 買進日之前的持股不計入；某檔當天沒有報價（停牌等）就沿用它最近一次的收盤價。
    # 參數：lots=買進紀錄、quotes=(代號, 交易日, 還原收盤價) 清單，需依交易日由舊到新排序
    if not lots:
        return []
    # 1. 把買進紀錄依日期排好，逐日「生效」
    pending = sorted(lots, key=lambda x: (x.trade_date, x.id))
    qty: dict[str, Decimal] = defaultdict(Decimal)  # 代號 → 目前持有股數
    last_price: dict[str, Decimal] = {}  # 代號 → 最近一次收盤價
    cost = Decimal(0)
    cost_x_day = Decimal(0)  # Σ(每筆投入成本 × 買進日序號)，用來快速算「成本加權平均持有天數」
    i = 0
    points = []
    # 2. 依交易日分組處理：先更新當天收盤價，再把當天（含）以前的買進紀錄加入持股
    day_quotes: dict[date, list] = defaultdict(list)
    for sym, d, px in quotes:
        day_quotes[d].append((sym, px))
    for d in sorted(day_quotes):
        if d < pending[0].trade_date:
            continue
        for sym, px in day_quotes[d]:
            last_price[sym] = px
        while i < len(pending) and pending[i].trade_date <= d:
            lot = pending[i]
            qty[lot.symbol] += lot.quantity
            cost += lot.quantity * lot.unit_cost
            cost_x_day += lot.quantity * lot.unit_cost * lot.trade_date.toordinal()
            last_price.setdefault(lot.symbol, lot.unit_cost)  # 保險：尚無報價時先用買進價
            i += 1
        # 3. 當天市值 = Σ 持有股數 × 最近收盤價
        value = sum((q * last_price[s] for s, q in qty.items()), Decimal(0))
        # 4. 當天年化報酬率：平均持有天數 = Σ(成本 × (當天 − 買進日)) ÷ Σ成本
        annual = None
        if cost > 0:
            days = int(((cost * d.toordinal() - cost_x_day) / cost).quantize(Decimal(1), ROUND_HALF_UP))
            annual = annualized_return((value - cost) / cost, days)
        points.append({"date": d.isoformat(), "marketValue": money(value), "costAmount": money(cost), "annualizedReturn": annual})
    return points
