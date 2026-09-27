"""產生黃金測試向量：以 reference_impl.py 計算，寫入 golden_vectors.json。
build_cases() 也供 tests/test_risk_metrics.py 取得同一批輸入資料（固定亂數種子，每次結果相同）。"""
import json
from pathlib import Path

import numpy as np

from reference_impl import SEED, mdd, r6, rf_daily, run, skew_g1

RF = 0.0169  # 利率選項 bank_average 的代表值（五家平均 1.690%）


def build_cases():
    # 回傳 {組別: (名稱, 日報酬矩陣, 權重, 大盤日報酬, 年利率)}；順序與亂數抽取順序固定，不可調動
    rng = np.random.default_rng(SEED)
    n = 250
    f = rng.normal(0.0004, 0.011, n)                      # 市場因子
    R1 = np.column_stack([
        0.9 * f + rng.normal(0.0002, 0.006, n),
        1.3 * f + rng.normal(0.0001, 0.010, n),
        0.5 * f + rng.normal(0.0003, 0.008, n),
    ])
    rm1 = f + rng.normal(0.0, 0.001, n)
    w1 = [0.5, 0.3, 0.2]
    cases = {
        "V1": ("三檔典型組合", R1, w1, rm1, RF),
        "V1z": ("三檔典型組合（利率選項 zero）", R1, w1, rm1, 0.0),
        "V2": ("單一持股", R1[:, [0]], [1.0], rm1, RF),
        "V3": ("含常數報酬序列", np.column_stack([np.full(n, 0.0005), R1[:, 1]]), [0.5, 0.5], rm1, RF),
    }
    # V4：全部報酬高於每日無風險利率
    R4 = np.column_stack([np.abs(rng.normal(0.002, 0.0005, n)) + rf_daily(RF) + 1e-5] * 2)
    cases["V4"] = ("全部高於無風險利率", R4, [0.6, 0.4], rm1, RF)
    # V5：明顯負偏態
    neg = -np.abs(rng.gamma(1.2, 0.010, n)) + 0.004
    cases["V5"] = ("明顯負偏態", np.column_stack([neg, neg * 0.8 + rng.normal(0, 0.002, n)]), [0.7, 0.3], rm1, RF)
    # V6：含負相關配對
    base = rng.normal(0.0003, 0.012, n)
    R6 = np.column_stack([base, -0.85 * base + rng.normal(0.0002, 0.003, n), 0.4 * base + rng.normal(0, 0.007, n)])
    cases["V6"] = ("含負相關配對", R6, [0.45, 0.35, 0.20], rm1, RF)
    # V7：n=29 與 n=30 的門檻
    cases["V7a"] = ("n=29", R1[:29], w1, rm1[:29], RF)
    cases["V7b"] = ("n=30", R1[:30], w1, rm1[:30], RF)
    return cases


def main():
    cases = build_cases()
    out = {k: run(*v) for k, v in cases.items()}
    # V8：G1 與母體偏態 b1 的關係
    rp8 = cases["V1"][1] @ np.array(cases["V1"][2])
    nn = len(rp8)
    b1 = float(np.mean(((rp8 - rp8.mean()) / np.std(rp8, ddof=0)) ** 3))
    g1 = skew_g1(rp8)
    out["V8"] = {"name": "G1 與母體偏態的關係", "n": nn, "b1_population": r6(b1), "G1_sample": r6(g1),
                 "ratio_observed": r6(g1 / b1), "ratio_expected": r6(np.sqrt(nn * (nn - 1)) / (nn - 2))}
    # V9：第一天就下跌，V0=1 必須納入高點
    out["V9"] = {"name": "第一天就下跌", "returns": [-0.10, 0.05, 0.02], "max_drawdown": r6(mdd(np.array([-0.10, 0.05, 0.02])))}
    path = Path(__file__).with_name("golden_vectors.json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for k, v in out.items():
        print(k, json.dumps(v, ensure_ascii=False)[:200])


if __name__ == "__main__":
    main()
