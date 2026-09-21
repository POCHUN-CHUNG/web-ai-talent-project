import os
import sys
from datetime import date, datetime, timezone
from decimal import Decimal as D
from pathlib import Path
from types import SimpleNamespace

import pytest

# 測試環境不連資料庫：先給假的連線字串，再把 backend 放進匯入路徑
os.environ.setdefault("DATABASE_URL", "postgresql://u:p@localhost/x")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.errors import ApiError  # noqa: E402
from app.services import portfolio as pf  # noqa: E402
from app.services import portfolio_data as pd_  # noqa: E402

TODAY = date(2026, 9, 21)
NOW = datetime(2026, 9, 21, tzinfo=timezone.utc)


def lot(i, symbol, d, q, c):
    # 一筆假的買進紀錄
    return SimpleNamespace(id=i, portfolio_id=1, symbol=symbol, trade_date=d, quantity=D(q), unit_cost=D(c), created=NOW, updated=NOW)


def test_c8_average_cost_three_lots():
    # C8：三筆不同單價，加權平均成本 = Σ(股數×單價)÷Σ股數 = (1000×100+500×120+500×140)/2000 = 115
    lots = [lot(1, "2330", date(2026, 1, 1), 1000, 100), lot(2, "2330", date(2026, 2, 1), 500, 120), lot(3, "2330", date(2026, 3, 1), 500, 140)]
    p = pf.build_positions(lots, {"2330": "台積電"}, {"2330": (D("130"), TODAY)}, TODAY)
    assert len(p) == 1 and p[0]["averageCost"] == "115.0000" and p[0]["quantity"] == "2000.0000"
    assert p[0]["costAmount"] == "230000.0000"
    assert len(p[0]["lots"]) == 3


def test_c9_pnl_equals_value_minus_cost():
    lots = [lot(1, "2330", date(2026, 1, 1), 1000, 100), lot(2, "2330", date(2026, 2, 1), 500, 120)]
    p = pf.build_positions(lots, {}, {"2330": (D("130"), TODAY)}, TODAY)[0]
    assert D(p["marketValue"]) - D(p["costAmount"]) == D(p["unrealizedPnl"])
    assert p["marketValue"] == "195000.0000" and p["unrealizedPnl"] == "35000.0000"
    assert sum(D(x["unrealizedPnl"]) for x in p["lots"]) == D(p["unrealizedPnl"])  # 各筆損益加總 = 部位損益


def test_c11_annualized_45_days_5_percent():
    assert pf.annualized_return(D("0.05"), 45) == pytest.approx(0.4855, abs=5e-5)


def test_c12_under_30_days_not_annualized():
    assert pf.annualized_return(D("0.05"), 20) is None
    assert pf.annualized_return(D("0.05"), 29) is None
    assert pf.annualized_return(D("0.05"), 30) is not None


def test_holding_days_weighted_by_cost():
    # 成本 100 元持有 100 天、成本 300 元持有 0 天 → 加權 25 天
    assert pf.weighted_days([(D(100), 100), (D(300), 0)]) == 25
    assert pf.weighted_days([]) == 0


def test_weights_sum_to_one_and_sorted():
    lots = [lot(1, "0050", date(2026, 1, 1), 100, 50), lot(2, "2330", date(2026, 1, 1), 10, 100)]
    prices = {"0050": (D("60"), TODAY), "2330": (D("300"), TODAY)}
    out = pf.build_detail(lots, {}, prices, TODAY)
    assert [p["symbol"] for p in out["positions"]] == ["0050", "2330"]  # 市值 6000 > 3000
    assert sum(p["weight"] for p in out["positions"]) == pytest.approx(1.0, abs=1e-5)
    t = out["totals"]
    assert t["costAmount"] == "6000.0000" and t["marketValue"] == "9000.0000" and t["unrealizedPnl"] == "3000.0000"
    assert t["unrealizedReturn"] == 0.5 and out["priceDisclaimer"] == "未納入手續費與交易稅"


def test_missing_price_marks_unavailable():
    # 某檔無報價：該檔市值與權重不可用，總覽的市值與損益也不可用（不拿不完整資料相加）
    lots = [lot(1, "0050", date(2026, 1, 1), 100, 50), lot(2, "2330", date(2026, 1, 1), 10, 100)]
    out = pf.build_detail(lots, {}, {"0050": (D("60"), TODAY)}, TODAY)
    assert [p["symbol"] for p in out["positions"]] == ["0050", "2330"]
    assert all(p["weight"] is None for p in out["positions"])
    assert out["positions"][1]["marketValue"] is None and out["positions"][1]["unrealizedPnl"] is None
    assert out["totals"]["marketValue"] is None and out["totals"]["unrealizedPnl"] is None
    assert out["totals"]["costAmount"] == "6000.0000"


def test_empty_portfolio():
    out = pf.build_detail([], {}, {}, TODAY)
    assert out["positions"] == [] and out["totals"]["costAmount"] == "0.0000"
    assert out["totals"]["unrealizedReturn"] is None and out["latestPriceDate"] is None


def test_lot_fields():
    x = pf.build_lot(lot(1, "2330", date(2026, 8, 22), 1000, 780), D("800"), TODAY)
    assert x["holdingDays"] == 30 and x["unrealizedPnl"] == "20000.0000" and x["unrealizedReturn"] == pytest.approx(0.025641, abs=1e-6)


@pytest.mark.parametrize("v", ["2330", "0050", "00878", "00631L", "00631l"])
def test_symbol_ok(v):
    assert pd_.parse_symbol(v) == v.upper()


@pytest.mark.parametrize("v", ["IR0001", "2330.TW", "233", "0330", "", "23300", 2330, None])
def test_symbol_bad(v):
    with pytest.raises(ApiError) as e:
        pd_.parse_symbol(v)
    assert e.value.status_code == 400


def test_c4_future_date_rejected():
    for v in ["2999-01-01", "1989-12-31", "2026-13-01", "2026/03/14", "20260314", None]:
        with pytest.raises(ApiError):
            pd_.parse_trade_date(v)
    assert pd_.parse_trade_date("1990-01-01") == date(1990, 1, 1)


def test_positive_numbers():
    assert pd_.parse_positive("780.0000", "單價", 8) == D("780.0000")
    assert pd_.parse_positive("1000", "股數", 14) == D("1000")
    for v in ["0", "-1", "abc", "NaN", "Infinity", "1.23456", "1e9", True, None, "100000000"]:
        with pytest.raises(ApiError):
            pd_.parse_positive(v, "單價", 8)


def test_name():
    assert pd_.parse_name("  核心持股 ") == "核心持股"
    for v in ["", "   ", "字" * 31, None, 5]:
        with pytest.raises(ApiError):
            pd_.parse_name(v)
