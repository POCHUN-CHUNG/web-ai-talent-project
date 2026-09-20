"""參考實作：依 spec/04-behavior.md §4.1 的公式獨立撰寫，用於產生黃金測試向量。
本檔不是產品程式，不進 backend/。"""
import json
import numpy as np

TD = 252
SEED = 20260920
ZERO_TOL = 1e-12  # 視為零變異的門檻：常數序列的樣本標準差因浮點誤差不會剛好為 0


def daily_returns(prices):
    p = np.asarray(prices, dtype=float)
    return (p[1:] - p[:-1]) / p[:-1]


def ann_return(rp):
    return float(np.prod(1.0 + rp) ** (TD / len(rp)) - 1.0)


def ann_vol(rp):
    return float(np.std(rp, ddof=1) * np.sqrt(TD))


def rf_daily(rf):
    return float((1.0 + rf) ** (1.0 / TD) - 1.0)


def downside_dev(rp, mar_d):
    d = np.minimum(rp - mar_d, 0.0)
    return float(np.sqrt(np.mean(d ** 2)) * np.sqrt(TD))


def beta_r2(rp, rm):
    cov = float(np.cov(rp, rm, ddof=1)[0, 1])
    var = float(np.var(rm, ddof=1))
    if var < ZERO_TOL ** 2:
        return None, None
    b = cov / var
    r = float(np.corrcoef(rp, rm)[0, 1])
    return b, r * r


def mdd_series(rp):
    v = np.cumprod(1.0 + rp)
    v = np.concatenate(([1.0], v))
    peak = np.maximum.accumulate(v)
    dd = (v - peak) / peak
    return float(dd.min()), v, dd


def es95(rp):
    q = float(np.quantile(rp, 0.05, method="linear"))
    tail = rp[rp <= q]
    return float(-tail.mean()), int(tail.size), q


def skew_g1(rp):
    n = len(rp)
    if n < 3:
        return None
    s = np.std(rp, ddof=1)
    if s < ZERO_TOL:
        return None
    z = (rp - rp.mean()) / s
    return float(n / ((n - 1) * (n - 2)) * np.sum(z ** 3))


def kurt_g2(rp):
    n = len(rp)
    if n < 4:
        return None
    s = np.std(rp, ddof=1)
    if s < ZERO_TOL:
        return None
    z = (rp - rp.mean()) / s
    a = n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * np.sum(z ** 4)
    b = 3 * (n - 1) ** 2 / ((n - 2) * (n - 3))
    return float(a - b)


def rc_pcr(w, R):
    cov_a = np.cov(R, rowvar=False, ddof=1) * TD
    cov_a = np.atleast_2d(cov_a)
    sp = float(np.sqrt(w @ cov_a @ w))
    if sp < ZERO_TOL:
        return 0.0, None, None
    mrc = cov_a @ w
    rc = w * mrc / sp
    return sp, rc, rc / sp


def corr_matrix(R):
    n = R.shape[1]
    M = np.full((n, n), np.nan)
    for i in range(n):
        for j in range(n):
            si, sj = np.std(R[:, i], ddof=1), np.std(R[:, j], ddof=1)
            if si < ZERO_TOL or sj < ZERO_TOL:
                M[i, j] = np.nan if i != j else 1.0
            else:
                M[i, j] = np.corrcoef(R[:, i], R[:, j])[0, 1]
    return M


def skew_class(g1, n):
    if g1 is None or n < 30:
        return "undetermined", "undetermined"
    if abs(g1) < 0.5:
        return "near_symmetric", "sharpe_primary"
    if g1 >= 0.5:
        return "positive_skew", "both"
    return "negative_skew", "sortino_primary"


def r6(x):
    return None if x is None else round(float(x), 6)


def run(name, R, w, rm, rf):
    R = np.asarray(R, dtype=float)
    w = np.asarray(w, dtype=float)
    rp = R @ w
    n = len(rp)
    mard = rf_daily(rf)
    ar = ann_return(rp)
    av = ann_vol(rp)
    dd = downside_dev(rp, mard)
    b, r2 = beta_r2(rp, rm) if rm is not None else (None, None)
    m, _, _ = mdd_series(rp)
    e, tc, _ = es95(rp)
    g1, g2 = skew_g1(rp), kurt_g2(rp)
    hhi = float(np.sum(w ** 2))
    sp, rc, pcr = rc_pcr(w, R)
    sharpe = (ar - rf) / av if av >= ZERO_TOL else None
    sortino = (ar - rf) / dd if dd >= ZERO_TOL else None
    sc, pf = skew_class(g1, n)
    return {
        "name": name, "n": n, "rf": r6(rf), "rf_daily": r6(mard),
        "annualized_return": r6(ar),
        "annualized_volatility": r6(av),
        "annualized_downside_deviation": r6(dd),
        "beta": r6(b), "r_squared": r6(r2),
        "max_drawdown": r6(m),
        "expected_shortfall_95": r6(e), "tail_count": tc,
        "skewness": r6(g1), "excess_kurtosis": r6(g2),
        "hhi": r6(hhi), "n_eff": r6(1 / hhi),
        "sharpe_ratio": r6(sharpe), "sortino_ratio": r6(sortino),
        "sigma_p_from_cov": r6(sp),
        "rc": None if rc is None else [r6(x) for x in rc],
        "pcr": None if pcr is None else [r6(x) for x in pcr],
        "skew_class": sc, "performance_focus": pf,
        "correlation": [[None if np.isnan(v) else r6(v) for v in row] for row in corr_matrix(R)],
    }
