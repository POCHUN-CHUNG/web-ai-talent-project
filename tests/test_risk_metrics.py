import json
import math
import os
import sys
from pathlib import Path

import numpy as np
import pytest

# 測試環境不連資料庫：先給假的連線字串，再把 backend 與測試向量產生器放進匯入路徑
os.environ.setdefault("DATABASE_URL", "postgresql://u:p@localhost/x")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "backend"))
sys.path.insert(0, str(ROOT / "fixtures"))

from app.services import risk_metrics as rm  # noqa: E402
from generate_vectors import build_cases  # noqa: E402

GOLDEN = json.loads((ROOT / "fixtures" / "golden_vectors.json").read_text(encoding="utf-8"))
CASES = build_cases()
REL, ABS = 1e-6, 1e-9  # 黃金向量比對容差（spec/05-quality.md §5.6）


def close(got, want):
    # 比對規則：null 只能對 null；期望值為 0 用絕對誤差，其餘用相對誤差（向量已四捨五入到 6 位，故再放寬半個捨入單位）
    if want is None or got is None:
        return want is None and got is None
    if abs(want) < 1e-6:
        return abs(got - want) < max(ABS, 5e-7)
    return abs(got - want) <= max(REL * abs(want), 5e-7)


def run_case(key):
    # 把向量的日報酬轉成價格（起點 1），交給產品程式計算
    _, R, w, rmk, rf = CASES[key]
    R = np.asarray(R, dtype=float)
    prices = np.vstack([np.ones(R.shape[1]), np.cumprod(1 + R, axis=0)])
    bench = np.concatenate([[1.0], np.cumprod(1 + np.asarray(rmk))])
    symbols = [f"S{i + 1}" for i in range(R.shape[1])]
    dates = [f"d{i:04d}" for i in range(len(prices))]
    return rm.compute_analysis(prices, bench, w, symbols, symbols, dates, rf)


VECTOR_KEYS = ["V1", "V1z", "V2", "V3", "V4", "V5", "V6", "V7a", "V7b"]
METRIC_KEYS = ["annualized_volatility", "annualized_downside_deviation", "max_drawdown", "expected_shortfall_95",
               "sharpe_ratio", "sortino_ratio", "beta", "r_squared", "skewness", "excess_kurtosis", "hhi",
               "effective_number_of_holdings"]
BENCHMARK_KEYS = ["annualized_volatility", "annualized_downside_deviation", "max_drawdown", "expected_shortfall_95",
                  "sharpe_ratio", "sortino_ratio"]


# ───────────────────────── 黃金向量（D5–D15、D25、D26） ─────────────────────────


@pytest.mark.parametrize("key", VECTOR_KEYS)
def test_golden_metrics_match(key):
    res, g = run_case(key), GOLDEN[key]
    for k in METRIC_KEYS:
        assert close(res["metrics"][k]["value"], g[k]), (key, k, res["metrics"][k], g[k])
    for k in BENCHMARK_KEYS:
        assert close(res["metrics"][k]["benchmarkValue"], g["benchmark_" + k]), (key, k)
    # 沒有大盤對照的指標，對照值一律為 null
    for k in set(METRIC_KEYS) - set(BENCHMARK_KEYS):
        assert res["metrics"][k]["benchmarkValue"] is None


@pytest.mark.parametrize("key", VECTOR_KEYS)
def test_golden_rc_correlation_and_labels(key):
    res, g = run_case(key), GOLDEN[key]
    by_symbol = {p["symbol"]: p for p in res["positions"]}
    symbols = res["correlation"]["symbols"]
    if g["rc"] is None:
        assert all(by_symbol[s]["rc"] is None and by_symbol[s]["pcr"] is None for s in symbols)
    else:
        for i, s in enumerate(symbols):
            assert close(by_symbol[s]["rc"], g["rc"][i]) and close(by_symbol[s]["pcr"], g["pcr"][i])
    for row_got, row_want in zip(res["correlation"]["matrix"], g["correlation"]):
        assert all(close(a, b) for a, b in zip(row_got, row_want))
    assert res["interpretation"]["skewClass"] == g["skew_class"]
    assert res["interpretation"]["sortinoPreferred"] == g["sortino_preferred"]
    assert res["dataQuality"]["tailCount"] == g["tail_count"]
    assert {x["key"]: x["typicalRuleId"] for x in res["diagnosis"]["groups"]} == g["diagnosis"]


def test_d13_d14_rc_identities():
    res = run_case("V6")
    rc = [p["rc"] for p in res["positions"]]
    pcr = [p["pcr"] for p in res["positions"]]
    assert abs(sum(rc) - res["metrics"]["annualized_volatility"]["value"]) < 1e-9
    assert abs(sum(pcr) - 1) < 1e-9
    assert min(pcr) < 0 and max(pcr) > 1  # 負風險貢獻保留，其他檔因此超過 100%


def test_positions_sorted_by_pcr_desc():
    pcr = [p["pcr"] for p in run_case("V1")["positions"]]
    assert pcr == sorted(pcr, reverse=True)


# ───────────────────────── 個別公式與邊界 ─────────────────────────


def test_d9_v9_first_day_drop_counts():
    # 柏鈞原程式漏掉起點 V0=1，這組會算出 0
    assert rm.max_drawdown([-0.10, 0.05, 0.02]) == pytest.approx(GOLDEN["V9"]["max_drawdown"])
    assert rm.max_drawdown([0.01, 0.02]) == 0.0


def test_d10_es_keeps_negative_when_tail_is_gain():
    es, tail = rm.expected_shortfall_95(np.linspace(0.001, 0.02, 100))
    assert es < 0 and tail == 5


def test_d7_daily_rate_is_compound():
    assert rm.daily_rate(0.0169) == pytest.approx((1.0169) ** (1 / 252) - 1)
    assert rm.daily_rate(0.0169) != pytest.approx(0.0169 / 252, rel=1e-6)
    assert rm.daily_rate(0.0) == 0.0


def test_d6_sharpe_is_arithmetic_not_geometric():
    _, R, w, _, rf = CASES["V1"]
    rp = np.asarray(R) @ np.asarray(w)
    arith, _ = rm.sharpe_ratio(rp, rm.daily_rate(rf))
    geo = ((np.prod(1 + rp) ** (252 / len(rp)) - 1) - rf) / (np.std(rp, ddof=1) * math.sqrt(252))
    assert arith == pytest.approx(GOLDEN["V1"]["sharpe_ratio"], rel=1e-5)
    assert abs(arith - geo) > 0.05


def test_d8_downside_uses_mar_not_zero():
    _, R, w, _, rf = CASES["V1"]
    rp = np.asarray(R) @ np.asarray(w)
    assert rm.downside_daily(rp, rm.daily_rate(rf)) != pytest.approx(rm.downside_daily(rp, 0.0), rel=1e-6)


def test_d15_constant_series_is_unavailable_not_huge():
    r = np.full(250, 0.0005)
    assert np.std(r, ddof=1) != 0  # 浮點誤差：常數序列的標準差不會剛好是 0
    assert rm.sharpe_ratio(r, 0.0) == (None, rm.REASON_FLAT)
    assert rm.correlation_matrix(np.column_stack([r, np.linspace(0, 1, 250)]))[0][1] is None


def test_d11_skewness_is_g1_not_population():
    _, R, w, _, _ = CASES["V1"]
    rp = np.asarray(R) @ np.asarray(w)
    g1, _ = rm.sample_skewness(rp)
    b1 = np.mean(((rp - rp.mean()) / np.std(rp)) ** 3)
    n = len(rp)
    assert g1 / b1 == pytest.approx(math.sqrt(n * (n - 1)) / (n - 2))
    assert g1 != pytest.approx(b1, rel=1e-4)


def test_d12_excess_kurtosis_near_zero_for_normal():
    g2, _ = rm.sample_excess_kurtosis(np.random.default_rng(20260920).normal(size=20000))
    assert abs(g2) < 0.2


def test_small_samples_unavailable():
    assert rm.sample_skewness([0.01, 0.02]) == (None, rm.REASON_FEW)
    assert rm.sample_excess_kurtosis([0.01, 0.02, 0.03]) == (None, rm.REASON_FEW)
    assert rm.annualized_volatility([0.01]) is None


def test_d19_single_holding():
    res = run_case("V2")
    assert res["metrics"]["hhi"]["value"] == 1.0 and res["metrics"]["effective_number_of_holdings"]["value"] == 1.0
    assert res["positions"][0]["pcr"] == pytest.approx(1.0)
    heat = next(f for f in res["figures"] if f["figureRef"] == "figure:correlation_heatmap")
    assert heat["status"] == "unavailable"
    group3 = next(x for x in res["diagnosis"]["groups"] if x["key"] == "concentration")
    assert group3["typicalLabel"] is None and "只有一檔持股" in group3["ruleReport"]


def test_drawdown_figure_has_start_point_and_trough():
    res = run_case("V1")
    fig = next(f for f in res["figures"] if f["figureRef"] == "figure:drawdown_curve")
    series = fig["data"]["series"]
    assert len(series) == GOLDEN["V1"]["n"] + 1 and series[0]["navIndex"] == 1.0 and series[0]["drawdown"] == 0.0
    assert fig["data"]["trough"]["drawdown"] == pytest.approx(res["metrics"]["max_drawdown"]["value"])


def test_d28_sortino_preferred_false_when_sortino_unavailable():
    assert run_case("V4")["interpretation"]["sortinoPreferred"] is False
    assert run_case("V5")["interpretation"]["sortinoPreferred"] is True


# ───────────────────────── 四組分析（D27，預期值抄自 spec/04-behavior.md §4.1.13） ─────────────────────────

HI, EQ, LO = "高於市場", "大致相當", "低於市場"


def side(**kw):
    # 一組假的組合／大盤指標；未指定的欄位給中性值（與大盤相同）
    base = {"sharpe": 1.0, "sortino": 1.0, "volatility": 0.2, "downside": 0.15, "mdd": -0.2, "es": 0.02}
    return {**base, **kw}


MARKET = side()


def test_signal_similar_bands():
    # 風險類：大盤值 ±10% 內為大致相當；夏普、索丁諾：相差 0.1 內為大致相當
    assert rm.compare_risk(0.22, 0.2) == EQ and rm.compare_risk(0.18, 0.2) == EQ
    assert rm.compare_risk(0.2201, 0.2) == HI and rm.compare_risk(0.1799, 0.2) == LO
    assert rm.compare_risk(0.35, 0.3, rm.DEEP, rm.SHALLOW) == rm.DEEP
    assert rm.compare_ratio(1.1, 1.0) == EQ and rm.compare_ratio(1.11, 1.0) == HI and rm.compare_ratio(-0.2, 0.05) == LO
    assert rm.compare_risk(None, 0.2) == "無法判斷"


def test_signal_skew_and_kurtosis():
    assert [rm.skew_signal(x, 250) for x in (-0.5, -0.49, 0.49, 0.5)] == ["負偏", "接近 0", "接近 0", "正偏"]
    assert rm.skew_signal(-1.0, 29) == "無法判斷"
    assert [rm.kurtosis_signal(x) for x in (1.0001, 1.0, -1.0, -1.0001)] == ["厚尾", "接近常態基準", "接近常態基準", "較薄尾"]


@pytest.mark.parametrize("p, rule, label", [
    (side(sharpe=2, sortino=2, volatility=0.1, downside=0.15), "E1", "風險報酬效率良好"),
    (side(sharpe=2, sortino=2, volatility=0.3, downside=0.2), "E2", "高風險但具有報酬補償"),
    (side(sharpe=0.5, sortino=0.5, volatility=0.3, downside=0.2), "E3", "無效率承擔風險"),
    (side(sharpe=0.5, sortino=2, volatility=0.3, downside=0.1), "E4", "總波動較大，但下行風險效率相對良好"),
    (side(sharpe=1.05, sortino=0.5, volatility=0.1, downside=0.2), "E5", "下行風險補償不足"),  # 夏普「尚可」＝大致相當也算
    (side(sharpe=0.5, sortino=0.5, volatility=0.1, downside=0.1), None, None),  # 風險不高但報酬效率不佳：沒有典型標籤
])
def test_risk_return_labels(p, rule, label):
    g = rm.analyze_risk_return(p, MARKET)
    assert (g["typicalRuleId"], g["typicalLabel"]) == (rule, label)


DEEP, SHALLOW, EQ_MDD = -0.3, -0.1, -0.2  # 大盤 MDD 為 -0.2
BIG_DD, SMALL_DD = 0.2, 0.1  # 大盤下行波動 0.15
BIG_ES, SMALL_ES = 0.03, 0.01  # 大盤 ES 0.02


@pytest.mark.parametrize("mdd, dd, es, g1, g2, rule", [
    (DEEP, BIG_DD, BIG_ES, -0.8, 3.0, "T1"),
    (DEEP, SMALL_DD, SMALL_ES, 0.1, 0.5, "T2"),
    (SHALLOW, BIG_DD, SMALL_ES, 0.1, 0.5, "T3"),
    (EQ_MDD, BIG_DD, SMALL_ES, 0.1, -2.0, "T3"),  # 回撤大致相當也算「不深」；較薄尾也算「非厚尾」
    (SHALLOW, SMALL_DD, BIG_ES, -0.8, 3.0, "T4"),
    (DEEP, BIG_DD, SMALL_ES, -0.8, 0.5, "T5"),
    (DEEP, SMALL_DD, BIG_ES, -0.8, 3.0, "T6"),
    (SHALLOW, BIG_DD, BIG_ES, 0.1, 3.0, "T7"),
    (DEEP, BIG_DD, BIG_ES, 0.1, 3.0, None),  # 最常見的真實情況：各方面都比大盤嚴重，但沒有典型標籤
    (SHALLOW, SMALL_DD, SMALL_ES, 0.1, 0.5, None),  # 原 T8 已刪除
])
def test_loss_risk_labels(mdd, dd, es, g1, g2, rule):
    g = rm.analyze_loss_risk(side(mdd=mdd, downside=dd, es=es), MARKET, g1, g2, 250)
    assert g["typicalRuleId"] == rule
    assert "綜合而言" in g["ruleReport"] and ("未符合典型結構" in g["ruleReport"]) == (rule is None)


def facts(n=5, ratio=0.9, avg=0.2, share=0.0, top_pcr=0.5, top_w=0.5, cluster_pcr=0.0, neg_corr=False, neg_rc=False):
    # 一組假的集中度事實
    return {"holdingCount": n, "hhi": 1 / (n * ratio), "equalWeightHhi": 1 / n, "effectiveHoldings": n * ratio,
            "effectiveRatio": ratio, "topK": min(3, n - 1), "topKSymbols": ["A"], "topKWeight": top_w, "topKPcr": top_pcr,
            "rcGap": None if top_pcr is None else top_pcr - top_w, "negativeRcPresent": neg_rc,
            "averageCorrelation": avg, "highPairShare": share, "negativeCorrelationPresent": neg_corr, "clusterPcr": cluster_pcr}


@pytest.mark.parametrize("f, rule, label", [
    (facts(ratio=0.5, avg=0.7, share=1.0, top_pcr=0.8, top_w=0.6), "C1", "結構性集中風險"),
    (facts(ratio=0.5, avg=0.2, top_pcr=0.8, top_w=0.6), "C2", "部位集中型風險"),
    (facts(ratio=0.5, avg=0.45, share=0.1, top_pcr=0.8, top_w=0.6), "C2", "部位集中型風險"),  # 混合相關也算
    (facts(avg=0.45, share=0.3, cluster_pcr=0.6), "C3", "假性分散"),
    (facts(avg=0.4, share=0.1, top_pcr=0.7, top_w=0.5), "C4", "風險貢獻集中"),
    (facts(avg=0.4, share=0.1, top_pcr=0.52, top_w=0.5), "C5", "實質分散"),
    (facts(avg=0.2, top_pcr=0.35, top_w=0.5), "C5", "實質分散"),  # 風險占比低於配置也算
    (facts(avg=0.2, top_pcr=0.52, top_w=0.5), "C6", "完整有效分散"),
    (facts(ratio=0.5, avg=0.2, top_pcr=0.52, top_w=0.5), None, None),  # 資金集中但風險相稱：沒有典型標籤
    (facts(avg=0.45, share=0.3, cluster_pcr=0.4), None, None),  # 有群聚但風險不在群組
])
def test_concentration_labels(f, rule, label):
    g = rm.analyze_concentration(f)
    assert (g["typicalRuleId"], g["typicalLabel"]) == (rule, label)


def test_concentration_signals_and_boundaries():
    s = rm.analyze_concentration(facts(ratio=0.7))["signals"]
    assert s["weight"] == "接近等權分散"
    assert rm.analyze_concentration(facts(avg=0.6, share=0.2))["signals"]["correlation"] == "高正相關群聚"
    assert rm.analyze_concentration(facts(avg=0.5, share=0.25))["signals"]["correlation"] == "高正相關群聚"
    assert rm.analyze_concentration(facts(avg=0.29, share=0.1))["signals"]["correlation"] == "混合相關結構"  # 有高相關配對就不算低相關
    assert rm.analyze_concentration(facts(top_pcr=0.6, top_w=0.5))["signals"]["riskContribution"] == "風險貢獻集中"
    assert rm.analyze_concentration(facts(top_pcr=0.4, top_w=0.5))["signals"]["riskContribution"] == "主要風險來源的風險占比低於其配置占比"
    g = rm.analyze_concentration(facts(neg_corr=True, neg_rc=True))
    assert g["signals"]["negativeCorrelation"] and g["signals"]["negativeRc"]
    assert "存在負相關持股" in g["ruleReport"] and "負風險貢獻" in g["ruleReport"]
    single = rm.analyze_concentration(facts(n=1, ratio=1.0, top_pcr=None))
    assert single["typicalLabel"] is None and single["signals"]["weight"] == "權重集中" and "只有一檔持股" in single["ruleReport"]


@pytest.mark.parametrize("r2, beta, top_pcr, rule", [
    (0.8, 1.3, 0.8, "M1"), (0.8, 1.3, 0.5, "M2"), (0.8, 1.0, 0.8, "M3"), (0.8, 1.0, 0.5, "M4"),
    (0.8, 0.5, 0.8, "M5"), (0.8, 0.5, 0.5, "M6"), (0.2, -0.3, 0.8, "M7"), (0.2, 1.3, 0.5, "M8"),
    (0.5, 1.3, 0.8, None),  # R² 中等：沒有典型標籤
    (0.8, -0.2, 0.5, None),  # 高解釋力卻反向
])
def test_market_labels(r2, beta, top_pcr, rule):
    assert rm.analyze_market(beta, r2, facts(top_pcr=top_pcr))["typicalRuleId"] == rule


def test_market_beta_role_depends_on_r2():
    assert rm.analyze_market(0.9, 0.7, facts())["signals"] | {} == {
        "rSquared": "市場解釋力較強", "beta": "敏感度接近市場", "betaRole": "主要判斷",
        "riskContribution": "風險貢獻與資金配置大致相稱", "negativeRc": False}
    assert rm.analyze_market(1.1, 0.4, facts())["signals"]["betaRole"] == "輔助解讀"
    weak = rm.analyze_market(1.5, 0.39, facts())
    assert weak["signals"]["betaRole"] == "不作主要判斷" and "僅供參考" in weak["ruleReport"]
    assert rm.analyze_market(None, 0.8, facts())["typicalLabel"] is None


def test_adverse_signals_priority_and_beta_rule():
    groups = [
        rm.analyze_risk_return(side(sharpe=0.5, sortino=0.5, volatility=0.3, downside=0.2), MARKET),
        rm.analyze_loss_risk(side(mdd=DEEP, downside=BIG_DD, es=BIG_ES), MARKET, 0.1, 3.0, 250),
        rm.analyze_concentration(facts(ratio=0.5, avg=0.2, top_pcr=0.8, top_w=0.6)),
        rm.analyze_market(1.3, 0.5, facts()),  # R² 中等：Beta 偏高不列入
    ]
    ids = [x["id"] for x in rm.adverse_signals(groups)]
    assert ids == ["mdd_deep", "es_high", "downside_high", "volatility_high", "rc_concentrated",
                   "weight_concentrated", "sharpe_low", "sortino_low", "kurtosis_fat"]
    groups[3] = rm.analyze_market(1.3, 0.8, facts())
    assert "beta_high" in [x["id"] for x in rm.adverse_signals(groups)]


def test_rule_report_mentions_values_and_benchmark():
    g = rm.analyze_risk_return(side(sharpe=2, sortino=2, volatility=0.3, downside=0.2), MARKET)
    assert g["ruleReport"].startswith("投資組合的年化波動度為 30.00%，高於台股加權報酬指數的 20.00%")
    assert "「高風險但具有報酬補償」" in g["ruleReport"]


def test_top_k_excludes_one_holding():
    # k = min(3, N−1)：兩檔時只看第一名，差距才可能不為 0
    f = rm.concentration_facts(["A", "B"], np.array([0.45, 0.55]), np.array([1.33, -0.33]), [[1.0, -0.9], [-0.9, 1.0]])
    assert f["topK"] == 1 and f["topKSymbols"] == ["A"] and f["rcGap"] == pytest.approx(0.88)
    assert f["negativeRcPresent"] and f["negativeCorrelationPresent"]
