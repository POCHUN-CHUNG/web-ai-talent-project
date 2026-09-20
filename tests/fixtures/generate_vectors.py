import json, numpy as np
from reference_impl import *

RF = 0.0169  # 五家平均 1.690%
rng = np.random.default_rng(SEED)
out = {}

# V1：3 檔、250 日
n = 250
f = rng.normal(0.0004, 0.011, n)                      # 市場因子
R1 = np.column_stack([
    0.9 * f + rng.normal(0.0002, 0.006, n),
    1.3 * f + rng.normal(0.0001, 0.010, n),
    0.5 * f + rng.normal(0.0003, 0.008, n),
])
rm1 = f + rng.normal(0.0, 0.001, n)
out["V1"] = run("三檔典型組合", R1, [0.5, 0.3, 0.2], rm1, RF)

# V2：單一持股
out["V2"] = run("單一持股", R1[:, [0]], [1.0], rm1, RF)

# V3：報酬全為常數
R3 = np.column_stack([np.full(n, 0.0005), R1[:, 1]])
out["V3"] = run("含常數報酬序列", R3, [0.5, 0.5], rm1, RF)

# V4：全部報酬高於 Rf_daily
mard = rf_daily(RF)
R4 = np.column_stack([np.abs(rng.normal(0.002, 0.0005, n)) + mard + 1e-5] * 2)
out["V4"] = run("全部高於無風險利率", R4, [0.6, 0.4], rm1, RF)

# V5：明顯負偏態
neg = -np.abs(rng.gamma(1.2, 0.010, n)) + 0.004
R5 = np.column_stack([neg, neg * 0.8 + rng.normal(0, 0.002, n)])
out["V5"] = run("明顯負偏態", R5, [0.7, 0.3], rm1, RF)

# V6：含負相關配對
base = rng.normal(0.0003, 0.012, n)
R6 = np.column_stack([base, -0.85 * base + rng.normal(0.0002, 0.003, n), 0.4 * base + rng.normal(0, 0.007, n)])
out["V6"] = run("含負相關配對", R6, [0.45, 0.35, 0.20], rm1, RF)

# V7：n=29 與 n=30 的門檻
out["V7a"] = run("n=29", R1[:29], [0.5, 0.3, 0.2], rm1[:29], RF)
out["V7b"] = run("n=30", R1[:30], [0.5, 0.3, 0.2], rm1[:30], RF)

# V8：G1 與母體偏態 b1 的關係
rp8 = R1 @ np.array([0.5, 0.3, 0.2])
nn = len(rp8)
s_pop = np.std(rp8, ddof=0)
b1 = float(np.mean(((rp8 - rp8.mean()) / s_pop) ** 3))
g1 = skew_g1(rp8)
out["V8"] = {"name": "G1 與母體偏態的關係", "n": nn,
             "b1_population": r6(b1), "G1_sample": r6(g1),
             "ratio_observed": r6(g1 / b1),
             "ratio_expected": r6(np.sqrt(nn * (nn - 1)) / (nn - 2))}

json.dump(out, open("golden_vectors.json", "w"), ensure_ascii=False, indent=1)
for k, v in out.items():
    print(k, json.dumps(v, ensure_ascii=False)[:260])
