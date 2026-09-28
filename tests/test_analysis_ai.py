import copy
import os
import re
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import numpy as np
import pytest

# 測試環境不連資料庫：先給假的連線字串，再把 backend 放進匯入路徑
os.environ.setdefault("DATABASE_URL", "postgresql://u:p@localhost/x")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.models import AnalysisResult  # noqa: E402
from app.services import analysis_ai as ai  # noqa: E402
from app.services import risk_metrics as rm  # noqa: E402

SYSTEM_PROMPT = (ROOT / "backend/app/prompts/risk_analysis_system.txt").read_text(encoding="utf-8")


def make_row(n_days=520, seed=7, requested_years=None, loss_tolerance="10 - 19 %") -> AnalysisResult:
    # 用固定亂數產生三檔持股與大盤的價格，跑真正的計算後組成一筆（不寫資料庫的）分析快照
    rng = np.random.default_rng(seed)
    market = rng.normal(0.0004, 0.01, n_days)
    R = np.column_stack([market * b + rng.normal(0, s, n_days) for b, s in [(1.3, 0.012), (1.1, 0.01), (0.4, 0.008)]])
    prices = np.vstack([np.ones(3), np.cumprod(1 + R, axis=0)])
    bench = np.concatenate([[1.0], np.cumprod(1 + market)])
    dates = [(date(2023, 1, 2) + timedelta(days=i)).isoformat() for i in range(n_days + 1)]
    res = rm.compute_analysis(prices, bench, [0.5, 0.3, 0.2], ["2330", "2317", "2412"], ["台積電", "鴻海", "中華電"], dates, 0.0)
    return AnalysisResult(
        id=1, user_id=1, portfolio_id=1, risk_profile_id=1,
        requested_years=requested_years, max_years=Decimal("2.06"),
        start_date=date.fromisoformat(dates[0]), end_date=date.fromisoformat(dates[-1]), trading_days=n_days + 1,
        limited_by=["2412"], benchmark_symbol="IR0001", rate_option="zero",
        risk_free_rate=Decimal("0"), rate_as_of=None, mar=Decimal("0"),
        profile_inputs={"investment_horizon": "5 - 9 年", "withdrawal_need": "偏低，不太需要動用",
                        "loss_tolerance": loss_tolerance, "changed_fields": []},
        metrics=res["metrics"], positions=res["positions"], correlation=res["correlation"],
        interpretation=res["interpretation"], diagnosis=res["diagnosis"], figures=res["figures"],
        data_quality=res["data_quality"],
    )


def good_report(payload: dict) -> dict:
    # 一份符合全部檢查的報告
    figs = ai.figure_refs(payload)
    text = "您的組合在這段期間的年化波動度比大盤起伏大，最大回撤也比大盤跌得深，主要風險來自資金最多的兩檔持股。" * 3
    return {
        "overall": {"features": ["起伏比大盤大", "風險集中在少數兩檔持股"], "text": text,
                    "focus": "目前最需要關注的是最大回撤比大盤跌得深，以及台積電（2330）帶來的風險比例偏高。",
                    "evidence_refs": ["metric:max_drawdown", "signal:" + payload["diagnosis"]["overall"]["adverse_signals"][0]["id"]]
                    if payload["diagnosis"]["overall"]["adverse_signals"] else ["metric:max_drawdown"]},
        "sections": [
            {"key": k, "text": text, "evidence_refs": [f"diagnosis:{k}"] if k != "personal_alignment" else ["profile:loss_tolerance"],
             "figure_refs": sorted(ai.SECTION_FIGURES.get(k, set()) & set(figs))}
            for k in ai.SECTION_KEYS
        ],
        "figure_captions": [{"figure_ref": f, "caption": "這段期間的最大回撤發生在分析期間的前半段，之後已回到前高。",
                             "evidence_refs": ["metric:max_drawdown"]} for f in figs],
        "review_directions": [{"text": "先確認風險貢獻度最高的兩檔持股，是否符合您原本的資金安排。",
                               "evidence_refs": ["risk_contribution:2330"], "figure_refs": ["figure:weight_vs_pcr"]}],
        "limitations": [],
    }


# ── Prompt 與後端的一致性 ──

def test_runtime_prompts_match_spec():
    for name in ["risk_analysis_system", "risk_analysis_user", "risk_analysis_retry"]:
        doc = (ROOT / "spec/prompts" / f"{name}.md").read_text(encoding="utf-8")
        block = re.search(r"```text\n(.*?)\n```", doc, re.S).group(1)
        assert (ROOT / "backend/app/prompts" / f"{name}.txt").read_text(encoding="utf-8").strip() == block.strip()


def test_diagnosis_rules_version_matches_prompt():
    assert re.search(r"^# diagnosis_rules_version: ([0-9.]+)", SYSTEM_PROMPT, re.M).group(1) == rm.DIAGNOSIS_RULES_VERSION
    assert re.fullmatch(r"\d+\.\d+\.\d+", ai.prompt_version())


def test_every_signal_key_and_value_is_in_prompt():
    row = make_row()
    for g in row.diagnosis["groups"]:
        for key in g["signals"]:
            assert key in SYSTEM_PROMPT, key
    texts = [rm.HI, rm.EQ, rm.LO, rm.DEEP, rm.SHALLOW, rm.NEG_SKEW, rm.ZERO_SKEW, rm.POS_SKEW, rm.FAT, rm.NORMAL, rm.THIN,
             rm.W_CONC, rm.W_EVEN, rm.C_CLUSTER, rm.C_MIXED, rm.C_LOW, rm.RC_CONC, rm.RC_EVEN, rm.RC_BELOW, rm.UNKNOWN,
             *rm.R2_TEXT.values(), *rm.BETA_TEXT.values()]
    for t in texts:
        assert t in SYSTEM_PROMPT, t


def test_every_typical_label_is_explained_in_prompt():
    for table in (rm.RISK_RETURN_LABELS, rm.LOSS_LABELS, rm.CONCENTRATION_LABELS, rm.MARKET_LABELS):
        for _, _, label in table:
            assert label in SYSTEM_PROMPT, label


def test_banned_terms_are_listed_in_prompt():
    rules = SYSTEM_PROMPT.split("禁用字詞：")[1].split("</rules>")[0]
    for t in ai.BANNED_TERMS:
        assert t in rules, t


def test_every_concentration_fact_is_in_prompt():
    for key in make_row().diagnosis["concentration"]:
        assert key in SYSTEM_PROMPT, key


# ── 組裝 payload ──

def test_payload_shape_and_trimmed_figures():
    payload = ai.build_payload(make_row())
    assert set(payload) == ai.PAYLOAD_KEYS
    assert payload["period"]["is_max_period"] is True and "requested_years" not in payload["period"]
    for f in payload["figures"]:
        assert "data" not in f and "legend_text" not in f
    dd = next(f for f in payload["figures"] if f["figure_ref"] == "figure:drawdown_curve")["facts"]
    assert dd["trough_drawdown"] == pytest.approx(payload["metrics"]["max_drawdown"]["value"])
    assert dd["peak_date"] <= dd["trough_date"]
    assert payload["profile_inputs"]["changed_fields"] == []


def test_payload_is_max_period_false_when_user_picked_years():
    assert ai.build_payload(make_row(requested_years=Decimal("2.0000")))["period"]["is_max_period"] is False


def test_forbidden_key_rejected():
    payload = ai.build_payload(make_row())
    payload["positions"][0]["cost"] = "100"
    with pytest.raises(RuntimeError):
        ai.assert_payload_allowed(payload)
    with pytest.raises(RuntimeError):
        ai.assert_payload_allowed({**ai.build_payload(make_row()), "extra": 1})


def test_user_prompt_placeholders_all_replaced():
    text = ai.render_user_prompt(ai.build_payload(make_row()))
    assert "{{" not in text and "figure:drawdown_curve" in text and rm.DIAGNOSIS_RULES_VERSION in text
    assert '"series"' not in text  # 回撤序列不送


def test_evidence_refs_order_and_content():
    payload = ai.build_payload(make_row())
    refs = ai.evidence_refs(payload)
    assert refs[:5] == ["period", "settings", "interpretation", "data_quality", "personal_alignment"]
    assert "corr:2330:2317" in refs and "corr:2317:2330" not in refs and "corr:2330:2330" not in refs
    assert refs[-3:] == ["profile:investment_horizon", "profile:withdrawal_need", "profile:loss_tolerance"]
    assert [r for r in refs if r.startswith("diagnosis:")] == [f"diagnosis:{k}" for k in rm.GROUP_TITLES]
    assert len(refs) == len(set(refs))


def test_single_holding_has_no_heatmap_ref():
    row = make_row()
    res = rm.compute_analysis([[1.0], [1.01], [0.99], [1.02]], [1.0, 1.01, 1.0, 1.01], [1.0], ["2330"], ["台積電"],
                              ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"], 0.0)
    row.figures, row.positions, row.correlation = res["figures"], res["positions"], res["correlation"]
    assert "figure:correlation_heatmap" not in ai.figure_refs(ai.build_payload(row))


# ── 後端的個人條件比對 ──

@pytest.mark.parametrize("mdd, q13, exp", [
    (-0.049, "未滿 5 %", "落在可接受損失區間內"),
    (-0.05, "未滿 5 %", "超過可接受損失區間"),
    (-0.15, "10 - 19 %", "落在可接受損失區間內"),
    (-0.199, "10 - 19 %", "落在可接受損失區間內"),
    (-0.20, "10 - 19 %", "超過可接受損失區間"),
    (-0.08, "10 - 19 %", "低於可接受損失區間"),
    (-0.90, "30 % 以上", "落在可接受損失區間內"),
    (-0.10, "30 % 以上", "低於可接受損失區間"),
    (None, "10 - 19 %", "無法判斷"),
    (-0.10, "不存在的選項", "無法判斷"),
])
def test_mdd_vs_loss_tolerance(mdd, q13, exp):
    assert ai.mdd_vs_loss_tolerance(mdd, q13) == exp


def test_drawdown_facts_with_and_without_recovery():
    def series(dds):
        return {"series": [{"date": f"d{i}", "nav_index": 1.0, "drawdown": x} for i, x in enumerate(dds)],
                "trough": {"date": f"d{int(np.argmin(dds))}", "drawdown": min(dds)}}
    f = ai.drawdown_facts(series([0, 0, -0.1, -0.3, -0.2, 0, -0.05]))
    assert (f["peak_date"], f["trough_date"], f["drawdown_trading_days"]) == ("d1", "d3", 2)
    assert (f["recovery_date"], f["recovery_trading_days"]) == ("d5", 2)
    g = ai.drawdown_facts(series([0, -0.1, -0.3, -0.2]))
    assert (g["peak_date"], g["recovery_date"], g["recovery_trading_days"]) == ("d0", None, None)
    h = ai.drawdown_facts(series([0, 0, 0]))
    assert h["recovery_trading_days"] == 0 and h["trough_drawdown"] == 0
    assert ai.drawdown_facts(None) is None


# ── 輸出內容檢查 ──

def test_good_report_passes():
    payload = ai.build_payload(make_row())
    assert ai.validate_report(good_report(payload), payload)


def _label_break(r, payload):
    label = next((g["typical_label"] for g in payload["diagnosis"]["groups"] if g["typical_label"]), None)
    r["sections"][0]["text"] = r["sections"][0]["text"][:100] + (f"屬於「{label}」。" if label else "E2")


@pytest.mark.parametrize("break_it", [
    lambda r, p: r["sections"].reverse(),
    lambda r, p: r["sections"].pop(),
    lambda r, p: r["overall"]["features"].append("第三句") or r["overall"]["features"].append("第四句"),
    lambda r, p: r["overall"].update(features=["只有一句話"]),
    lambda r, p: r["overall"].update(text="太短"),
    lambda r, p: r["overall"].update(evidence_refs=[]),
    lambda r, p: r["sections"][0].update(evidence_refs=["metric:not_exist"]),
    lambda r, p: r["sections"][0].update(figure_refs=["figure:drawdown_curve"]),
    lambda r, p: r["sections"][1].update(figure_refs=["figure:weight_vs_pcr"]),
    lambda r, p: r["figure_captions"].pop(),
    lambda r, p: r["figure_captions"].reverse(),
    lambda r, p: r["review_directions"].extend([r["review_directions"][0]] * 3),
    lambda r, p: r["limitations"].extend(["限制"] * 4),
    lambda r, p: r["sections"][2].update(text=r["sections"][2]["text"][:100] + "！"),
    lambda r, p: r["sections"][2].update(text=r["sections"][2]["text"][:100] + "熱圖中紅色的格子較多。"),
    lambda r, p: r["sections"][2].update(text=r["sections"][2]["text"][:100] + "依典型標籤判斷。"),
    lambda r, p: r["sections"][2].update(text=r["sections"][2]["text"][:100] + "符合規則 C2。"),
    lambda r, p: r["sections"][3].update(text=r["sections"][3]["text"][:100] + "R² 為 64.36%。"),
    lambda r, p: r["sections"][0].update(text=r["sections"][0]["text"][:100] + "年化波動度高於大盤。"),
    lambda r, p: r["sections"][4].update(text=r["sections"][4]["text"][:100] + "後端比對結果顯示超過區間。"),
    _label_break,
])
def test_broken_report_rejected(break_it):
    payload = ai.build_payload(make_row())
    r = good_report(payload)
    break_it(r, payload)
    with pytest.raises(ai.AiOutputInvalid):
        ai.validate_report(r, payload)


def test_generate_retries_then_succeeds():
    payload = ai.build_payload(make_row())
    bad = copy.deepcopy(good_report(payload))
    bad["sections"].pop()
    outs, sleeps = iter([bad, good_report(payload)]), []
    prompts = []
    assert ai.generate_report(payload, call=lambda up, rp: prompts.append(rp) or next(outs), sleep=sleeps.append)
    assert sleeps == [2]
    assert prompts[0] is None and "段落不是依序的五段" in prompts[1] and "{{" not in prompts[1]


def test_generate_gives_up_after_max_attempts():
    payload = ai.build_payload(make_row())
    bad = good_report(payload)
    bad["sections"].pop()
    calls = []
    with pytest.raises(ai.AiOutputInvalid):
        ai.generate_report(payload, call=lambda up, rp: calls.append(up) or bad, sleep=lambda s: None)
    assert len(calls) == 3


def test_not_configured_is_not_retried():
    payload = ai.build_payload(make_row())
    calls = []

    def no_key(up, rp):
        calls.append(up)
        raise ai.AiNotConfigured()
    with pytest.raises(ai.AiNotConfigured):
        ai.generate_report(payload, call=no_key, sleep=lambda s: None)
    assert len(calls) == 1


def test_all_text_problems_reported_together():
    payload = ai.build_payload(make_row())
    r = good_report(payload)
    r["sections"][3]["text"] = r["sections"][3]["text"][:100] + "R² 為 64.36%，HHI 偏高。"
    r["overall"]["focus"] = r["overall"]["focus"] + "熱圖中紅色較多。"
    with pytest.raises(ai.AiOutputInvalid) as e:
        ai.validate_report(r, payload)
    msg = str(e.value)
    assert "sections.market_sensitivity 含禁用字詞：R²、HHI" in msg and "overall.focus 描述了圖表顏色：紅色" in msg
