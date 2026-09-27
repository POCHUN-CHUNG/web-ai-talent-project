"""參考實作：依 spec/04-behavior.md §4.1 的公式獨立撰寫，用於產生黃金測試向量。
本檔不是產品程式，不進 backend/，也不得引用 backend/app/services/risk_metrics.py。"""
import numpy as np

TD = 252
SEED = 20260920
ZERO_TOL = 1e-12  # 視為零變異的門檻：常數序列的樣本標準差因浮點誤差不會剛好為 0


def rf_daily(rf):
    return float((1.0 + rf) ** (1.0 / TD) - 1.0)


def ann_vol(r):
    return float(np.std(r, ddof=1) * np.sqrt(TD))


def downside_daily(r, mar_d):
    d = np.minimum(r - mar_d, 0.0)
    return float(np.sqrt(np.mean(d ** 2)))


def sharpe(r, rf_d):
    s = np.std(r, ddof=1)
    if s < ZERO_TOL:
        return None
    return float(np.mean(r - rf_d) / s * np.sqrt(TD))


def sortino(r, mar_d):
    dd = downside_daily(r, mar_d)
    if dd < ZERO_TOL:
        return None
    return float(np.mean(r - mar_d) / dd * np.sqrt(TD))


def beta_r2(rp, rm):
    var = float(np.var(rm, ddof=1))
    if np.sqrt(var) < ZERO_TOL:
        return None, None
    b = float(np.cov(rp, rm, ddof=1)[0, 1]) / var
    if np.std(rp, ddof=1) < ZERO_TOL:
        return b, None
    r = float(np.corrcoef(rp, rm)[0, 1])
    return b, r * r


def mdd(r):
    v = np.concatenate(([1.0], np.cumprod(1.0 + np.asarray(r, dtype=float))))
    peak = np.maximum.accumulate(v)
    return float(((v - peak) / peak).min())


def es95(r):
    q = float(np.quantile(r, 0.05, method="linear"))
    tail = r[r <= q]
    return float(-tail.mean()), int(tail.size)


def skew_g1(r):
    n = len(r)
    if n < 3:
        return None
    s = np.std(r, ddof=1)
    if s < ZERO_TOL:
        return None
    z = (r - r.mean()) / s
    return float(n / ((n - 1) * (n - 2)) * np.sum(z ** 3))


def kurt_g2(r):
    n = len(r)
    if n < 4:
        return None
    s = np.std(r, ddof=1)
    if s < ZERO_TOL:
        return None
    z = (r - r.mean()) / s
    a = n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * np.sum(z ** 4)
    b = 3 * (n - 1) ** 2 / ((n - 2) * (n - 3))
    return float(a - b)


def rc_pcr(w, R):
    cov_a = np.atleast_2d(np.cov(R, rowvar=False, ddof=1) * TD)
    sp = float(np.sqrt(w @ cov_a @ w))
    if sp < ZERO_TOL:
        return sp, None, None
    rc = w * (cov_a @ w) / sp
    return sp, rc, rc / sp


def corr_matrix(R):
    k = R.shape[1]
    M = np.full((k, k), np.nan)
    for i in range(k):
        for j in range(k):
            if i == j:
                M[i, j] = 1.0
            elif np.std(R[:, i], ddof=1) >= ZERO_TOL and np.std(R[:, j], ddof=1) >= ZERO_TOL:
                M[i, j] = np.corrcoef(R[:, i], R[:, j])[0, 1]
    return M


def skew_class(g1, n):
    if g1 is None or n < 30:
        return "undetermined"
    if abs(g1) < 0.5:
        return "near_symmetric"
    return "positive_skew" if g1 >= 0.5 else "negative_skew"


# ── 四組分析：直接抄 spec/04-behavior.md §4.1.13 的訊號定義與典型標籤表 ──


def cmp_risk(p, m, hi="高於市場", lo="低於市場"):
    if p is None or m is None:
        return "無法判斷"
    if abs(p - m) <= 0.10 * abs(m) + 1e-12:
        return "大致相當"
    return hi if p > m else lo


def cmp_ratio(p, m):
    if p is None or m is None:
        return "無法判斷"
    if abs(p - m) <= 0.10 + 1e-12:
        return "大致相當"
    return "高於市場" if p > m else "低於市場"


def ok(want, got):
    return want is None or got in want


HI, EQ, LO = "高於市場", "大致相當", "低於市場"
NH = {EQ, LO}
G1_TABLE = [
    ("E1", {HI}, {HI}, NH, NH), ("E2", {HI}, {HI}, {HI}, {HI}), ("E3", {LO}, {LO}, {HI}, {HI}),
    ("E4", {LO}, {HI}, {HI}, NH), ("E5", {HI, EQ}, {LO}, None, {HI}),
]
DP, ND, NF = {"深於市場"}, {"大致相當", "淺於市場"}, {"接近常態基準", "較薄尾"}
G2_TABLE = [
    ("T1", DP, {HI}, {HI}, {"負偏"}, {"厚尾"}), ("T2", DP, NH, NH, {"接近 0"}, NF),
    ("T3", ND, {HI}, NH, {"接近 0"}, NF), ("T4", ND, NH, {HI}, {"負偏"}, {"厚尾"}),
    ("T5", DP, {HI}, NH, {"負偏"}, NF), ("T6", DP, NH, {HI}, {"負偏"}, {"厚尾"}),
    ("T7", ND, {HI}, {HI}, {"接近 0"}, {"厚尾"}),
]


def first(table, dims):
    for row in table:
        if all(ok(want, got) for want, got in zip(row[1:], dims)):
            return row[0]
    return None


def diagnose(p, m, g1, g2, n, w, pcr, C, beta, r2):
    out = {}
    # 第一組：風險與報酬
    out["risk_return"] = first(G1_TABLE, (cmp_ratio(p["sharpe"], m["sharpe"]), cmp_ratio(p["sortino"], m["sortino"]),
                                          cmp_risk(p["vol"], m["vol"]), cmp_risk(p["dd"], m["dd"])))
    # 第二組：虧損風險
    sk = "無法判斷" if g1 is None or n < 30 else ("負偏" if g1 <= -0.5 else ("正偏" if g1 >= 0.5 else "接近 0"))
    ku = "無法判斷" if g2 is None else ("厚尾" if g2 > 1 else ("較薄尾" if g2 < -1 else "接近常態基準"))
    out["loss_risk"] = first(G2_TABLE, (cmp_risk(abs(p["mdd"]), abs(m["mdd"]), "深於市場", "淺於市場"),
                                        cmp_risk(p["dd"], m["dd"]), cmp_risk(p["es"], m["es"]), sk, ku))
    # 共用：風險貢獻訊號（前 k 名，k = min(3, N−1)）
    N = len(w)
    rc = "無法判斷"
    if pcr is not None and N > 1:
        top = np.lexsort((-w, -pcr))[:min(3, N - 1)]
        gap = float(pcr[top].sum() - w[top].sum())
        rc = "集中" if gap >= 0.10 - 1e-12 else ("低於" if gap <= -0.10 + 1e-12 else "相稱")
    # 第三組：集中與分散
    label3 = None
    if N > 1 and pcr is not None:
        iu = np.triu_indices(N, 1)
        vals = C[iu]
        good = ~np.isnan(vals)
        vals = vals[good]
        if vals.size:
            avg, share = float(vals.mean()), float((vals >= 0.6).mean())
            corr = "群聚" if share >= 0.25 - 1e-12 or avg >= 0.6 else ("低" if avg < 0.3 and share == 0 else "混合")
            members = {x for a, b, v in zip(iu[0][good], iu[1][good], vals) if v >= 0.6 for x in (a, b)}
            majority = sum(pcr[i] for i in members) >= 0.5 - 1e-12
            weight = "集中" if (1 / np.sum(w ** 2)) / N < 0.7 else "等權"
            if weight == "集中" and corr == "群聚" and rc == "集中":
                label3 = "C1"
            elif weight == "集中" and corr in ("低", "混合") and rc == "集中":
                label3 = "C2"
            elif weight == "等權" and corr == "群聚" and majority:
                label3 = "C3"
            elif weight == "等權" and corr in ("低", "混合") and rc == "集中":
                label3 = "C4"
            elif weight == "等權" and corr == "低" and rc == "相稱":
                label3 = "C6"
            elif weight == "等權" and corr in ("低", "混合") and rc in ("相稱", "低於"):
                label3 = "C5"
    out["concentration"] = label3
    # 第四組：市場敏感與風險來源（R² 中等時沒有典型標籤）
    label4 = None
    if beta is not None and r2 is not None:
        lv = "above" if beta > 1.1 else ("near" if beta >= 0.9 else ("below" if beta >= 0 else "negative"))
        conc = rc == "集中"
        if r2 >= 0.7:
            label4 = {("above", True): "M1", ("above", False): "M2", ("near", True): "M3", ("near", False): "M4",
                      ("below", True): "M5", ("below", False): "M6"}.get((lv, conc))
        elif r2 < 0.4:
            label4 = "M7" if conc else "M8"
    out["market_sensitivity"] = label4
    return out


def r6(x):
    return None if x is None else round(float(x), 6)


def run(name, R, w, rm, rf):
    R = np.asarray(R, dtype=float)
    w = np.asarray(w, dtype=float)
    rm = np.asarray(rm, dtype=float)
    rp = R @ w
    n = len(rp)
    d = rf_daily(rf)

    def side(r):
        e, tc = es95(r)
        return {"vol": ann_vol(r), "dd": downside_daily(r, d) * np.sqrt(TD), "mdd": mdd(r),
                "es": e, "tail": tc, "sharpe": sharpe(r, d), "sortino": sortino(r, d)}

    p, m = side(rp), side(rm)
    b, r2 = beta_r2(rp, rm)
    g1, g2 = skew_g1(rp), kurt_g2(rp)
    hhi = float(np.sum(w ** 2))
    sp, rc, pcr = rc_pcr(w, R)
    C = corr_matrix(R)
    sc = skew_class(g1, n)
    return {
        "name": name, "n": n, "rf": r6(rf), "rf_daily": r6(d),
        "annualized_volatility": r6(p["vol"]), "benchmark_annualized_volatility": r6(m["vol"]),
        "annualized_downside_deviation": r6(p["dd"]), "benchmark_annualized_downside_deviation": r6(m["dd"]),
        "max_drawdown": r6(p["mdd"]), "benchmark_max_drawdown": r6(m["mdd"]),
        "expected_shortfall_95": r6(p["es"]), "benchmark_expected_shortfall_95": r6(m["es"]),
        "tail_count": p["tail"],
        "sharpe_ratio": r6(p["sharpe"]), "benchmark_sharpe_ratio": r6(m["sharpe"]),
        "sortino_ratio": r6(p["sortino"]), "benchmark_sortino_ratio": r6(m["sortino"]),
        "beta": r6(b), "r_squared": r6(r2),
        "skewness": r6(g1), "excess_kurtosis": r6(g2),
        "hhi": r6(hhi), "effective_number_of_holdings": r6(1 / hhi),
        "sigma_p_from_cov": r6(sp),
        "rc": None if rc is None else [r6(x) for x in rc],
        "pcr": None if pcr is None else [r6(x) for x in pcr],
        "skew_class": sc,
        "sortino_preferred": sc in ("positive_skew", "negative_skew") and p["sortino"] is not None,
        "correlation": [[None if np.isnan(v) else r6(v) for v in row] for row in C],
        "diagnosis": diagnose(p, m, g1, g2, n, w, pcr, C, b, r2),
    }
