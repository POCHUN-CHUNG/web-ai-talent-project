import math

import numpy as np

# 【風險指標計算】投資組合的 14 項風險指標（其中 6 項另算市場基準 IR0001 的對照值）與四組風險分析。
# 全部是純計算：只用 NumPy，不碰資料庫與網路；公式與規則的唯一依據是 spec/04-behavior.md §4.1。
# 讀資料、決定分析期間、寫入快照在 services/analysis.py。
# 文字分兩種對象：metrics 的 reason、圖說、資料提醒會顯示給使用者，一律白話；
# 四組分析的訊號、典型標籤、規則報告只給 AI 閱讀，可用專業用語。

TRADING_DAYS = 252  # 一年的交易日數，用於年化
ZERO_TOL = 1e-12  # 標準差小於此值即視為「沒有變動」；門檻比較也以此容許浮點誤差
IDENTITY_TOL = 1e-9  # 兩條算法應相等的容許誤差（風險貢獻加總 = 組合波動度）
MIN_SKEW_N = 30  # 偏態判讀所需的最少日報酬筆數
SIMILAR_RISK = 0.10  # 風險類指標與大盤相差在大盤值的 ±10% 內，視為「大致相當」
SIMILAR_RATIO = 0.10  # 夏普、索丁諾與大盤相差在 0.1 內，視為「大致相當」（兩者可能接近 0 或為負，不適合用百分比）
SKEW_NEAR_ZERO = 0.5  # |偏態| 小於此值視為接近 0
KURT_BAND = 1.0  # 超額峰度 > 1 為厚尾、< −1 為較薄尾，其餘為接近常態基準
WEIGHT_CONCENTRATED = 0.7  # 有效持股 ÷ 實際持股 小於此值（即 HHI 超過 1/N 的 1.43 倍）視為權重集中
HIGH_CORR = 0.6  # 兩檔相關係數達此值視為高相關配對
CLUSTER_SHARE = 0.25  # 高相關配對占全部配對達此比例（或配對平均達 HIGH_CORR）視為高正相關群聚
LOW_CORR = 0.3  # 配對平均小於此值、且沒有高相關配對，視為低相關結構
RC_GAP = 0.10  # 前 k 大風險貢獻與同批權重相差 10 個百分點以上，視為集中（或低於配置）
CLUSTER_PCR = 0.5  # 高相關群聚成員的風險貢獻合計達此值，視為「群組集中」（假性分散的條件）
R2_STRONG, R2_MODERATE = 0.7, 0.4  # R² 的強／中分界（Morningstar）
BETA_NEAR_LOW, BETA_NEAR_HIGH = 0.9, 1.1  # Beta 介於兩者之間（含端點）視為接近市場
DIAGNOSIS_RULES_VERSION = "2.0.0"  # 四組分析規則的版本，寫入快照
RULE_SOURCE = "本專題規則 v2.0：|G1| < 0.5 視為近似對稱"  # 偏態分類的規則來源說明
BENCHMARK_NAME = "台股加權報酬指數"  # 規則報告中對市場基準 IR0001 的稱呼

# 必要訊號的文字（依《四組後端風險分析規則》）
HI, EQ, LO = "高於市場", "大致相當", "低於市場"
DEEP, SHALLOW = "深於市場", "淺於市場"
NEG_SKEW, ZERO_SKEW, POS_SKEW = "負偏", "接近 0", "正偏"
FAT, NORMAL, THIN = "厚尾", "接近常態基準", "較薄尾"
W_CONC, W_EVEN = "權重集中", "接近等權分散"
C_CLUSTER, C_MIXED, C_LOW = "高正相關群聚", "混合相關結構", "低相關結構"
RC_CONC, RC_EVEN, RC_BELOW = "風險貢獻集中", "風險貢獻與資金配置大致相稱", "主要風險來源的風險占比低於其配置占比"
R2_TEXT = {"strong": "市場解釋力較強", "moderate": "市場解釋力中等", "weak": "市場解釋力較弱"}
BETA_TEXT = {"above": "對市場較敏感", "near": "敏感度接近市場", "below": "對市場較不敏感", "negative": "與市場呈反方向敏感關係"}
UNKNOWN = "無法判斷"  # 指標不可用時的訊號

GROUP_TITLES = {  # 四組分析的代號與名稱（順序固定）
    "risk_return": "風險與報酬",
    "loss_risk": "虧損風險",
    "concentration": "集中與分散風險",
    "market_sensitivity": "市場敏感與風險來源",
}

NOT_HI, HI_EQ, NOT_DEEP, NOT_FAT = {EQ, LO}, {HI, EQ}, {EQ, SHALLOW}, {NORMAL, THIN}  # 典型標籤條件用的訊號集合
ANY = None  # 典型標籤條件：該欄不限
# 第一組典型標籤：欄位依序為 夏普、索丁諾、年化波動、下行波動
RISK_RETURN_LABELS = [
    ("E1", ({HI}, {HI}, NOT_HI, NOT_HI), "風險報酬效率良好"),
    ("E2", ({HI}, {HI}, {HI}, {HI}), "高風險但具有報酬補償"),
    ("E3", ({LO}, {LO}, {HI}, {HI}), "無效率承擔風險"),
    ("E4", ({LO}, {HI}, {HI}, NOT_HI), "總波動較大，但下行風險效率相對良好"),
    ("E5", (HI_EQ, {LO}, ANY, {HI}), "下行風險補償不足"),
]
# 第二組典型標籤：欄位依序為 最大回撤、下行波動、預期短缺、偏態、峰度
LOSS_LABELS = [
    ("T1", ({DEEP}, {HI}, {HI}, {NEG_SKEW}, {FAT}), "完整下行風險結構"),
    ("T2", ({DEEP}, NOT_HI, NOT_HI, {ZERO_SKEW}, NOT_FAT), "累積回撤型風險"),
    ("T3", (NOT_DEEP, {HI}, NOT_HI, {ZERO_SKEW}, NOT_FAT), "一般下行波動型"),
    ("T4", (NOT_DEEP, NOT_HI, {HI}, {NEG_SKEW}, {FAT}), "突發性左尾風險"),
    ("T5", ({DEEP}, {HI}, NOT_HI, {NEG_SKEW}, NOT_FAT), "累積性下行風險"),
    ("T6", ({DEEP}, NOT_HI, {HI}, {NEG_SKEW}, {FAT}), "尾端衝擊伴隨深度回撤"),
    ("T7", (NOT_DEEP, {HI}, {HI}, {ZERO_SKEW}, {FAT}), "高下行波動與厚尾風險"),
]
# 第三組典型標籤：欄位依序為 權重、相關結構、風險貢獻；"cluster_majority" 代表群聚成員風險合計過半。
# 由上而下比對：C6 比 C5 嚴格，所以排在 C5 前面
CONCENTRATION_LABELS = [
    ("C1", ({W_CONC}, {C_CLUSTER}, {RC_CONC}), "結構性集中風險"),
    ("C2", ({W_CONC}, {C_LOW, C_MIXED}, {RC_CONC}), "部位集中型風險"),
    ("C3", ({W_EVEN}, {C_CLUSTER}, "cluster_majority"), "假性分散"),
    ("C4", ({W_EVEN}, {C_LOW, C_MIXED}, {RC_CONC}), "風險貢獻集中"),
    ("C6", ({W_EVEN}, {C_LOW}, {RC_EVEN}), "完整有效分散"),
    ("C5", ({W_EVEN}, {C_LOW, C_MIXED}, {RC_EVEN, RC_BELOW}), "實質分散"),
]
# 第四組典型標籤：欄位依序為 R² 等級、Beta 等級、風險貢獻是否集中；R² 中等時沒有典型標籤
MARKET_LABELS = [
    ("M1", ("strong", {"above"}, True), "市場敏感＋持股風險集中"),
    ("M2", ("strong", {"above"}, False), "市場敏感型"),
    ("M3", ("strong", {"near"}, True), "市場敏感度接近市場＋內部風險集中"),
    ("M4", ("strong", {"near"}, False), "市場連動且風險來源分散"),
    ("M5", ("strong", {"below"}, True), "低市場敏感＋持股風險集中"),
    ("M6", ("strong", {"below"}, False), "低市場敏感＋風險來源分散"),
    ("M7", ("weak", ANY, True), "Beta 解釋力有限＋持股風險集中"),
    ("M8", ("weak", ANY, False), "Beta 解釋力有限＋持股風險分散"),
]

FIGURE_TEXT = {  # 三張圖的標題與圖說（顯示給使用者，白話）
    "figure:drawdown_curve": ("回撤走勢",
                              "回撤代表投資組合從先前高點下跌的幅度。曲線越往下，代表距離先前高點越遠；最低點就是這段期間的最大回撤。"),
    "figure:weight_vs_pcr": ("風險貢獻度",
                             "風險貢獻度表示每檔股票對整個組合漲跌起伏的影響有多大。長條越長，代表這檔股票帶來的風險越大，不一定是你放最多錢的那一檔。"),
    "figure:correlation_heatmap": ("相關係數熱圖",
                                   "這張圖顯示各持股過去是否常常一起漲跌。紅色越深代表越常一起漲跌，藍色代表常常一漲一跌。"
                                   "如果主要持股大多常常一起漲跌，就算持有很多檔，分散風險的效果也可能有限。"),
}

REASON_FEW = "資料天數太少，無法計算"  # 以下為顯示給使用者的「無法計算」原因
REASON_FLAT = "這段期間組合價格沒有變動，無法計算"
REASON_NO_DOWN = "這段期間沒有任何一天的報酬低於你選的比較利率，無法計算下跌風險"
REASON_MARKET = "大盤資料異常，暫時無法比較"


# ───────────────────────── 基本運算 ─────────────────────────


def daily_rate(annual: float) -> float:
    # 【年利率轉日利率】以複利換算 (1+年利率)^(1/252)-1，不用「年利率÷252」。參數：annual=年利率（小數）
    return (1.0 + annual) ** (1.0 / TRADING_DAYS) - 1.0


def simple_returns(prices) -> np.ndarray:
    # 【日報酬】(今日價 − 昨日價) ÷ 昨日價；輸入可為一維（單一序列）或二維（每欄一檔）。參數：prices=依日期排序的價格
    p = np.asarray(prices, dtype=float)
    return (p[1:] - p[:-1]) / p[:-1]


def _finite(x):
    # 【過濾非數字】無限大或 NaN 一律改為 None，避免回傳無意義的數值。參數：x=計算結果
    return None if x is None or not math.isfinite(x) else float(x)


def _sd(r) -> float:
    # 【樣本標準差】ddof=1（除以 n−1）。參數：r=報酬序列
    return float(np.std(r, ddof=1))


def annualized_volatility(r):
    # 【年化波動度】樣本標準差 × √252；少於 2 筆回 None。參數：r=日報酬序列
    return None if len(r) < 2 else _sd(r) * math.sqrt(TRADING_DAYS)


def downside_daily(r, mar_d: float) -> float:
    # 【日下行偏差】只看低於門檻的部分：√(Σ min(報酬−門檻, 0)² ÷ n)，分母是全部筆數 n、不減平均數。
    # 參數：r=日報酬序列、mar_d=每日最低可接受報酬
    d = np.minimum(np.asarray(r) - mar_d, 0.0)
    return float(np.sqrt(np.mean(d ** 2)))


def sharpe_ratio(r, rf_d: float):
    # 【夏普比率】算術年化：日平均超額報酬 ÷ 日標準差 × √252；總波動為零時無法計算。
    # 參數：r=日報酬序列、rf_d=每日無風險利率；回傳 (值, 無法計算的原因)
    if len(r) < 2:
        return None, REASON_FEW
    s = _sd(r)
    if s < ZERO_TOL:
        return None, REASON_FLAT
    return _finite(np.mean(np.asarray(r) - rf_d) / s * math.sqrt(TRADING_DAYS)), None


def sortino_ratio(r, mar_d: float):
    # 【索丁諾比率】算術年化：日平均超額報酬 ÷ 日下行偏差 × √252；沒有低於門檻的日子時無法計算。
    # 參數：r=日報酬序列、mar_d=每日最低可接受報酬；回傳 (值, 無法計算的原因)
    if len(r) < 2:
        return None, REASON_FEW
    dd = downside_daily(r, mar_d)
    if dd < ZERO_TOL:
        return None, REASON_NO_DOWN
    return _finite(np.mean(np.asarray(r) - mar_d) / dd * math.sqrt(TRADING_DAYS)), None


def drawdown_path(r):
    # 【回撤走勢】從淨值 1 起算（第一筆即起點 V0=1），每天相對「到目前為止最高淨值」的跌幅。
    # 參數：r=日報酬序列；回傳 (淨值序列, 回撤序列)，兩者都比報酬多一筆（起點）
    nav = np.concatenate(([1.0], np.cumprod(1.0 + np.asarray(r, dtype=float))))
    peak = np.maximum.accumulate(nav)
    return nav, (nav - peak) / peak


def max_drawdown(r) -> float:
    # 【最大回撤】回撤序列的最小值，保留負號（例 -0.28 代表曾從高點跌 28%）。參數：r=日報酬序列
    return float(drawdown_path(r)[1].min())


def expected_shortfall_95(r):
    # 【95% 預期短缺】最差 5% 日子的平均損失，以正數表示損失；分位數採線性內插。
    # 用負號轉正而不用絕對值：尾端平均若仍是正報酬，結果應為負數而不是被翻成損失。
    # 參數：r=日報酬序列；回傳 (預期短缺, 尾端筆數)
    r = np.asarray(r, dtype=float)
    q = np.quantile(r, 0.05, method="linear")
    tail = r[r <= q]
    return float(-tail.mean()), int(tail.size)


def beta_and_r_squared(rp, rm):
    # 【Beta 與判定係數】Beta = Cov(組合, 大盤) ÷ Var(大盤)；R² = 兩者相關係數的平方（單因子迴歸下兩者相等）。
    # 參數：rp=組合日報酬、rm=大盤日報酬；回傳 (beta, r2, 無法計算的原因)
    if len(rp) < 2:
        return None, None, REASON_FEW
    sm = _sd(rm)
    if sm < ZERO_TOL:
        return None, None, REASON_MARKET
    beta = float(np.cov(rp, rm, ddof=1)[0, 1]) / sm ** 2
    if _sd(rp) < ZERO_TOL:
        return _finite(beta), None, REASON_FLAT
    return _finite(beta), _finite(float(np.corrcoef(rp, rm)[0, 1]) ** 2), None


def _standardized(r):
    # 【標準化】(報酬 − 平均) ÷ 樣本標準差；標準差為零時回 None。參數：r=日報酬序列
    r = np.asarray(r, dtype=float)
    s = _sd(r)
    return None if s < ZERO_TOL else (r - r.mean()) / s


def sample_skewness(r):
    # 【樣本偏態 G1】n ÷ ((n−1)(n−2)) × Σz³（z 以樣本標準差標準化）；少於 3 筆或無變異時無法計算。
    # 參數：r=日報酬序列；回傳 (值, 原因)
    n = len(r)
    if n < 3:
        return None, REASON_FEW
    z = _standardized(r)
    if z is None:
        return None, REASON_FLAT
    return _finite(n / ((n - 1) * (n - 2)) * np.sum(z ** 3)), None


def sample_excess_kurtosis(r):
    # 【樣本超額峰度 G2】偏誤校正後的峰度再減去常態的基準，常態分布為 0；少於 4 筆或無變異時無法計算。
    # 參數：r=日報酬序列；回傳 (值, 原因)
    n = len(r)
    if n < 4:
        return None, REASON_FEW
    z = _standardized(r)
    if z is None:
        return None, REASON_FLAT
    a = n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * np.sum(z ** 4)
    b = 3 * (n - 1) ** 2 / ((n - 2) * (n - 3))
    return _finite(a - b), None


def risk_contribution(weights, R):
    # 【風險貢獻度】以年化共變異數矩陣拆解組合波動：RC_i = w_i×(Σw)_i ÷ σp、PCR_i = RC_i ÷ σp（加總為 100%）。
    # 負值合法（代表抵銷效果），不取絕對值。組合波動為零時無法拆解。
    # 參數：weights=各檔權重、R=日報酬矩陣（每欄一檔）；回傳 (σp, rc 陣列或 None, pcr 陣列或 None)
    w = np.asarray(weights, dtype=float)
    cov = np.atleast_2d(np.cov(R, rowvar=False, ddof=1)) * TRADING_DAYS
    sigma = float(np.sqrt(w @ cov @ w))
    if sigma < ZERO_TOL:
        return sigma, None, None
    rc = w * (cov @ w) / sigma
    pcr = rc / sigma
    # 自我檢查：加總必須等於組合波動與 100%，否則代表權重或共變異數來源不一致
    if abs(rc.sum() - sigma) > IDENTITY_TOL or abs(pcr.sum() - 1.0) > IDENTITY_TOL:
        raise ValueError("風險貢獻度加總與組合波動不一致")
    return sigma, rc, pcr


def correlation_matrix(R) -> list:
    # 【相關係數矩陣】持股兩兩之間的 Pearson 相關係數，對角線為 1；報酬無變異的持股無法計算，填 None（不可填 0）。
    # 參數：R=日報酬矩陣（每欄一檔）；回傳二維清單
    R = np.atleast_2d(np.asarray(R, dtype=float))
    k = R.shape[1]
    sd = np.std(R, axis=0, ddof=1)
    m = [[1.0 if i == j else None for j in range(k)] for i in range(k)]
    for i in range(k):
        for j in range(i + 1, k):
            if sd[i] >= ZERO_TOL and sd[j] >= ZERO_TOL:
                m[i][j] = m[j][i] = _finite(np.corrcoef(R[:, i], R[:, j])[0, 1])
    return m


def skew_class(g1, n: int) -> str:
    # 【偏態分類】|G1| < 0.5 為近似對稱；樣本少於 30 筆或無法計算時不判定。參數：g1=樣本偏態、n=日報酬筆數
    if g1 is None or n < MIN_SKEW_N:
        return "undetermined"
    if abs(g1) < SKEW_NEAR_ZERO:
        return "near_symmetric"
    return "positive_skew" if g1 >= SKEW_NEAR_ZERO else "negative_skew"


# ───────────────────────── 必要訊號 ─────────────────────────


def compare_risk(p, m, higher=HI, lower=LO):
    # 【風險類與大盤比較】相差在大盤值 ±10% 內為大致相當，否則依大小回高於／低於。
    # 參數：p=組合值、m=大盤值、higher／lower=兩種結果的文字（最大回撤用深於／淺於）
    if p is None or m is None:
        return UNKNOWN
    if abs(p - m) <= SIMILAR_RISK * abs(m) + ZERO_TOL:
        return EQ
    return higher if p > m else lower


def compare_ratio(p, m):
    # 【夏普、索丁諾與大盤比較】相差在 0.1 內為大致相當，否則依大小回高於／低於。參數：p=組合值、m=大盤值
    if p is None or m is None:
        return UNKNOWN
    if abs(p - m) <= SIMILAR_RATIO + ZERO_TOL:
        return EQ
    return HI if p > m else LO


def skew_signal(g1, n: int) -> str:
    # 【偏態訊號】≤ −0.5 負偏、≥ 0.5 正偏、其餘接近 0；樣本不足 30 筆無法判斷。參數：g1=樣本偏態、n=日報酬筆數
    if g1 is None or n < MIN_SKEW_N:
        return UNKNOWN
    return NEG_SKEW if g1 <= -SKEW_NEAR_ZERO else (POS_SKEW if g1 >= SKEW_NEAR_ZERO else ZERO_SKEW)


def kurtosis_signal(g2) -> str:
    # 【峰度訊號】> 1 厚尾、< −1 較薄尾、其餘接近常態基準。參數：g2=樣本超額峰度
    if g2 is None:
        return UNKNOWN
    return FAT if g2 > KURT_BAND else (THIN if g2 < -KURT_BAND else NORMAL)


def _matches(pattern, values) -> bool:
    # 【比對一列條件】每個欄位為允許的訊號集合，ANY 代表不限。參數：pattern=條件、values=實際訊號
    return all(want is ANY or got in want for want, got in zip(pattern, values))


def _first_label(rules, values):
    # 【找典型標籤】由上而下取第一個符合的標籤；都不符合回 (None, None)。參數：rules=標籤條件表、values=實際訊號
    for rule_id, pattern, label in rules:
        if _matches(pattern, values):
            return rule_id, label
    return None, None


def _pct(x) -> str:
    # 【百分比文字】規則報告用，小數 2 位；None 顯示為 N/A。參數：x=小數比例
    return "N/A" if x is None else f"{x * 100:.2f}%"


def _num(x) -> str:
    # 【數值文字】規則報告用，小數 2 位；None 顯示為 N/A。參數：x=數值
    return "N/A" if x is None else f"{x:.2f}"


def _vs(signal: str, market_text: str) -> str:
    # 【與大盤比較的句子】例「高於台股加權報酬指數的 17.97%」。參數：signal=訊號、market_text=大盤數值文字
    if signal == UNKNOWN:
        return "無法與台股加權報酬指數比較"
    if signal == EQ:
        return f"與{BENCHMARK_NAME}的 {market_text} 大致相當"
    return f"{signal.replace('市場', '')}{BENCHMARK_NAME}的 {market_text}"


def _group(key: str, raw: dict, signals: dict, label_id, label, report: str) -> dict:
    # 【組一組分析結果】參數：key=組別代號、raw=原始數值、signals=必要訊號、label_id／label=典型標籤（可為 None）、report=規則報告
    return {"key": key, "title": GROUP_TITLES[key], "rawValues": raw, "signals": signals,
            "typicalRuleId": label_id, "typicalLabel": label, "ruleReport": report}


def _conclusion(label, parts: list[str], suffix: str) -> str:
    # 【報告結論句】有典型標籤就用標籤，沒有就把各訊號串成描述。參數：label=典型標籤、parts=訊號描述、suffix=結尾名詞
    if label:
        return f"綜合而言，目前主要呈現「{label}」的{suffix}。"
    return f"綜合而言，目前未符合典型結構，主要{suffix}為：{'、'.join(parts)}。"


# ───────────────────────── 四組分析 ─────────────────────────


def analyze_risk_return(p: dict, m: dict) -> dict:
    # 【第一組：風險與報酬】先看年化波動與下行波動（風險高低），再看夏普與索丁諾（報酬補償），最後比對典型標籤。
    # 參數：p=組合指標、m=大盤指標（皆含 sharpe、sortino、volatility、downside）
    s = {
        "volatility": compare_risk(p["volatility"], m["volatility"]),
        "downside": compare_risk(p["downside"], m["downside"]),
        "sharpe": compare_ratio(p["sharpe"], m["sharpe"]),
        "sortino": compare_ratio(p["sortino"], m["sortino"]),
    }
    rid, label = _first_label(RISK_RETURN_LABELS, (s["sharpe"], s["sortino"], s["volatility"], s["downside"]))
    raw = {k: p[k] for k in s} | {f"market_{k}": m[k] for k in s}
    report = (
        f"投資組合的年化波動度為 {_pct(p['volatility'])}，{_vs(s['volatility'], _pct(m['volatility']))}；"
        f"下行波動度為 {_pct(p['downside'])}，{_vs(s['downside'], _pct(m['downside']))}；"
        f"夏普比率為 {_num(p['sharpe'])}，{_vs(s['sharpe'], _num(m['sharpe']))}；"
        f"索丁諾比率為 {_num(p['sortino'])}，{_vs(s['sortino'], _num(m['sortino']))}。"
        + _conclusion(label, [f"總體風險{s['volatility']}", f"下行風險{s['downside']}",
                              f"總風險報酬補償{s['sharpe']}", f"下行風險報酬補償{s['sortino']}"], "風險與報酬特徵")
    )
    return _group("risk_return", raw, s, rid, label, report)


def analyze_loss_risk(p: dict, m: dict, g1, g2, n: int) -> dict:
    # 【第二組：虧損風險】依序看下行波動、95% 預期短缺、最大回撤、偏態、峰度，再比對典型標籤。
    # 參數：p=組合指標、m=大盤指標（皆含 downside、es、mdd）、g1=偏態、g2=超額峰度、n=日報酬筆數
    s = {
        "downside": compare_risk(p["downside"], m["downside"]),
        "es": compare_risk(p["es"], m["es"]),
        "mdd": compare_risk(abs(p["mdd"]), abs(m["mdd"]), DEEP, SHALLOW),
        "skew": skew_signal(g1, n),
        "kurtosis": kurtosis_signal(g2),
    }
    rid, label = _first_label(LOSS_LABELS, (s["mdd"], s["downside"], s["es"], s["skew"], s["kurtosis"]))
    raw = {"downside": p["downside"], "es": p["es"], "mdd": p["mdd"], "skewness": g1, "excess_kurtosis": g2,
           "market_downside": m["downside"], "market_es": m["es"], "market_mdd": m["mdd"]}
    report = (
        f"投資組合的下行波動度為 {_pct(p['downside'])}，{_vs(s['downside'], _pct(m['downside']))}；"
        f"95% 預期短缺為 {_pct(p['es'])}，{_vs(s['es'], _pct(m['es']))}；"
        f"最大回撤為 {_pct(p['mdd'])}，{_vs(s['mdd'], _pct(m['mdd']))}。"
        f"樣本偏態為 {_num(g1)}，呈現{s['skew']}；樣本超額峰度為 {_num(g2)}，呈現{s['kurtosis']}。"
        + _conclusion(label, [f"一般下行波動{s['downside']}", f"尾端平均損失{s['es']}", f"累積回撤{s['mdd']}",
                              f"報酬分布偏態{s['skew']}", f"峰度{s['kurtosis']}"], "虧損風險特徵")
    )
    return _group("loss_risk", raw, s, rid, label, report)


def concentration_facts(symbols: list, weights, pcr, corr: list) -> dict:
    # 【集中度事實】第三、四組共用的數字：HHI、有效持股、前 k 大風險來源與權重、相關結構、高相關群聚、權重前 3 大的相互相關。
    # 前 k 名取 k = min(3, N−1)：若涵蓋全部持股，風險貢獻與權重合計都是 100%，差距恆為 0。
    # 參數：symbols=代號、weights=權重、pcr=風險貢獻比例（可為 None）、corr=相關係數矩陣
    w = np.asarray(weights, dtype=float)
    n = len(w)
    hhi = float(np.sum(w ** 2))
    k = min(3, n - 1)
    facts = {
        "holdingCount": n, "hhi": hhi, "equalWeightHhi": 1.0 / n, "effectiveHoldings": 1.0 / hhi,
        "effectiveRatio": (1.0 / hhi) / n, "topK": k, "topKSymbols": [], "topKWeight": None, "topKPcr": None, "rcGap": None,
        "negativeRcPresent": bool(pcr is not None and (pcr < 0).any()),
        "averageCorrelation": None, "highPairShare": None, "negativeCorrelationPresent": False,
        "topPairs": [], "topWeightPairs": [], "clusterSymbols": [], "clusterWeight": 0.0, "clusterPcr": None,
    }
    # 1. 前 k 大風險來源（風險貢獻比例由大到小，同值時權重大者優先）
    if pcr is not None and k > 0:
        top = np.lexsort((-w, -pcr))[:k]
        facts.update(topKSymbols=[symbols[i] for i in top], topKWeight=float(w[top].sum()), topKPcr=float(pcr[top].sum()))
        facts["rcGap"] = facts["topKPcr"] - facts["topKWeight"]
    # 2. 相關結構：只看兩兩配對，無法計算（None）的配對不計
    pairs = [(corr[i][j], i, j) for i in range(n) for j in range(i + 1, n) if corr[i][j] is not None]
    if pairs:
        vals = np.array([v for v, _, _ in pairs])
        members = sorted({x for v, i, j in pairs if v >= HIGH_CORR for x in (i, j)})
        heavy = set(np.argsort(-w, kind="stable")[:3].tolist())  # 權重前 3 大持股
        facts.update(
            averageCorrelation=float(vals.mean()),
            highPairShare=float((vals >= HIGH_CORR).mean()),
            negativeCorrelationPresent=bool((vals < 0).any()),
            topPairs=[{"symbols": [symbols[i], symbols[j]], "correlation": v} for v, i, j in sorted(pairs, key=lambda x: -x[0])[:5]],
            topWeightPairs=[{"symbols": [symbols[i], symbols[j]], "correlation": v} for v, i, j in pairs if i in heavy and j in heavy],
            clusterSymbols=[symbols[i] for i in members],
            clusterWeight=float(w[members].sum()) if members else 0.0,
            clusterPcr=None if pcr is None else (float(pcr[members].sum()) if members else 0.0),
        )
    return facts


def rc_signal(facts: dict) -> str:
    # 【風險貢獻訊號】前 k 大風險貢獻 − 同批權重：≥ 10 個百分點為集中、≤ −10 為低於配置、其餘為大致相稱。
    # 兩個合計相減帶有浮點誤差（0.6−0.5 得 0.0999…），比較時容許 ZERO_TOL。參數：facts=集中度事實
    gap = facts["rcGap"]
    if gap is None:
        return UNKNOWN
    if gap >= RC_GAP - ZERO_TOL:
        return RC_CONC
    return RC_BELOW if gap <= -RC_GAP + ZERO_TOL else RC_EVEN


def correlation_signal(facts: dict) -> str:
    # 【相關結構訊號】高相關配對占 25% 以上（或平均 ≥ 0.6）為高正相關群聚；平均 < 0.3 且沒有高相關配對為低相關結構；其餘為混合。
    # 參數：facts=集中度事實
    avg, share = facts["averageCorrelation"], facts["highPairShare"]
    if avg is None:
        return UNKNOWN
    if share >= CLUSTER_SHARE - ZERO_TOL or avg >= HIGH_CORR:
        return C_CLUSTER
    return C_LOW if avg < LOW_CORR and share == 0 else C_MIXED


def analyze_concentration(facts: dict) -> dict:
    # 【第三組：集中與分散風險】資金集中嗎 → 主要持股是否一起動 → 實際風險是否集中，再比對典型標籤。參數：facts=集中度事實
    single = facts["holdingCount"] == 1
    s = {
        "weight": W_CONC if facts["effectiveRatio"] < WEIGHT_CONCENTRATED else W_EVEN,
        "correlation": UNKNOWN if single else correlation_signal(facts),
        "negativeCorrelation": facts["negativeCorrelationPresent"],
        "riskContribution": UNKNOWN if single else rc_signal(facts),
        "negativeRc": facts["negativeRcPresent"],
        "clusterRiskMajority": (facts["clusterPcr"] or 0.0) >= CLUSTER_PCR - ZERO_TOL,
    }
    if single:
        s["weight"] = W_CONC
    rid = label = None
    if not single:
        for rule_id, (weight, corrs, rc), name in CONCENTRATION_LABELS:
            rc_ok = s["clusterRiskMajority"] if rc == "cluster_majority" else s["riskContribution"] in rc
            if s["weight"] in weight and s["correlation"] in corrs and rc_ok:
                rid, label = rule_id, name
                break
    f = facts
    if single:
        report = "投資組合只有一檔持股，資金與風險完全集中於該檔，無法評估持股之間的相關結構與分散效果。" + _conclusion(None, ["單一持股"], "集中或分散特徵")
    else:
        extra_corr = "；存在負相關持股" if s["negativeCorrelation"] else ""
        extra_rc = "；存在風險抵銷持股（負風險貢獻）" if s["negativeRc"] else ""
        top = "、".join(f["topKSymbols"]) or "N/A"
        report = (
            f"投資組合 HHI 為 {f['hhi']:.4f}（{f['holdingCount']} 檔等權配置的理論值為 {f['equalWeightHhi']:.4f}），權重配置呈現{s['weight']}；"
            f"有效持股數為 {f['effectiveHoldings']:.2f} 檔，相較實際 {f['holdingCount']} 檔持股，約為等權分散的 {f['effectiveRatio'] * 100:.0f}%。"
            f"主要持股的相關結構呈現{s['correlation']}（兩兩相關係數平均 {_num(f['averageCorrelation'])}，"
            f"相關係數 ≥ {HIGH_CORR} 的配對占 {_pct(f['highPairShare'])}）{extra_corr}。"
            f"前 {f['topK']} 大風險來源（{top}）占 {_pct(f['topKWeight'])} 資金配置，貢獻 {_pct(f['topKPcr'])} 總風險，"
            f"{s['riskContribution']}{extra_rc}。"
            + _conclusion(label, [s["weight"], s["correlation"], s["riskContribution"]], "集中或分散特徵")
        )
    raw = {k: f[k] for k in ("hhi", "equalWeightHhi", "effectiveHoldings", "holdingCount", "averageCorrelation",
                              "highPairShare", "topKWeight", "topKPcr", "rcGap", "clusterPcr")}
    return _group("concentration", raw, s, rid, label, report)


def beta_level(beta) -> str:
    # 【Beta 等級】> 1.1 較敏感、0.9～1.1 接近市場、0～0.9 較不敏感、< 0 反向。參數：beta=Beta 值
    if beta > BETA_NEAR_HIGH:
        return "above"
    if beta >= BETA_NEAR_LOW:
        return "near"
    return "below" if beta >= 0 else "negative"


def analyze_market(beta, r2, facts: dict) -> dict:
    # 【第四組：市場敏感與風險來源】先看 R² 的市場解釋力，再依 R² 強弱解讀 Beta，最後看風險是否集中於少數持股。
    # 參數：beta=Beta、r2=判定係數、facts=集中度事實（單一持股時風險貢獻視為未集中）
    rc = UNKNOWN if facts["holdingCount"] == 1 else rc_signal(facts)
    if beta is None or r2 is None:
        s = {"rSquared": UNKNOWN, "beta": UNKNOWN, "betaRole": UNKNOWN, "riskContribution": rc, "negativeRc": facts["negativeRcPresent"]}
        report = "R² 或 Beta 無法計算，無法判斷市場敏感程度。" + _conclusion(None, [f"風險貢獻{rc}"], "市場敏感與風險來源特徵")
        return _group("market_sensitivity", {"beta": beta, "r_squared": r2}, s, None, None, report)
    r2_level = "strong" if r2 >= R2_STRONG else ("moderate" if r2 >= R2_MODERATE else "weak")
    level = beta_level(beta)
    role = {"strong": "主要判斷", "moderate": "輔助解讀", "weak": "不作主要判斷"}[r2_level]
    s = {"rSquared": R2_TEXT[r2_level], "beta": BETA_TEXT[level], "betaRole": role,
         "riskContribution": rc, "negativeRc": facts["negativeRcPresent"]}
    rid, label = None, None
    for rule_id, (r2_want, beta_want, conc), name in MARKET_LABELS:
        if r2_level == r2_want and (beta_want is ANY or level in beta_want) and (rc == RC_CONC) == conc:
            rid, label = rule_id, name
            break
    beta_text = {"主要判斷": f"可作為主要判斷：{BETA_TEXT[level]}",
                 "輔助解讀": f"僅作輔助解讀（{BETA_TEXT[level]}）",
                 "不作主要判斷": "因市場解釋力較弱，數值僅供參考，不作主要判斷"}[role]
    report = (
        f"投資組合 R² 為 {_pct(r2)}，顯示{BENCHMARK_NAME}對組合歷史報酬具有{R2_TEXT[r2_level][5:]}程度的解釋力。"
        f"Beta 為 {_num(beta)}，在目前 R² 條件下，其市場敏感度訊號{beta_text}。"
        f"風險貢獻度顯示{rc}{'；存在風險抵銷持股（負風險貢獻）' if s['negativeRc'] else ''}。"
        + _conclusion(label, [R2_TEXT[r2_level], f"Beta {role}", rc], "市場敏感與風險來源特徵")
    )
    return _group("market_sensitivity", {"beta": beta, "r_squared": r2}, s, rid, label, report)


# 不利訊號的固定優先順序（綜合診斷用）：(代號, 所屬組別, 取訊號的方式, 觸發值, 給 AI 的描述)
ADVERSE_RULES = [
    ("mdd_deep", "loss_risk", "mdd", DEEP, "最大回撤深於市場"),
    ("es_high", "loss_risk", "es", HI, "95% 預期短缺高於市場"),
    ("downside_high", "risk_return", "downside", HI, "下行波動度高於市場"),
    ("volatility_high", "risk_return", "volatility", HI, "年化波動度高於市場"),
    ("rc_concentrated", "concentration", "riskContribution", RC_CONC, "風險貢獻集中於少數持股"),
    ("correlation_cluster", "concentration", "correlation", C_CLUSTER, "持股存在高正相關群聚"),
    ("weight_concentrated", "concentration", "weight", W_CONC, "權重集中"),
    ("sharpe_low", "risk_return", "sharpe", LO, "夏普比率低於市場"),
    ("sortino_low", "risk_return", "sortino", LO, "索丁諾比率低於市場"),
    ("beta_high", "market_sensitivity", "beta", BETA_TEXT["above"], "對市場較敏感（R² 較強且 Beta 大於 1.1）"),
    ("skew_negative", "loss_risk", "skew", NEG_SKEW, "報酬分布負偏"),
    ("kurtosis_fat", "loss_risk", "kurtosis", FAT, "報酬分布厚尾"),
]


def adverse_signals(groups: list[dict]) -> list[dict]:
    # 【不利訊號清單】依固定優先順序列出目前出現的不利訊號，供 AI 挑出最主要的風險來源（規則 P-49）。
    # Beta 偏高只在 R² 較強時列入，因為其他情況下 Beta 不作主要判斷。參數：groups=四組分析結果
    by_key = {g["key"]: g for g in groups}
    out = []
    for sid, key, field, trigger, text in ADVERSE_RULES:
        s = by_key[key]["signals"]
        if s.get(field) == trigger and (sid != "beta_high" or s.get("betaRole") == "主要判斷"):
            out.append({"id": sid, "groupKey": key, "text": text})
    return out


# ───────────────────────── 總流程 ─────────────────────────


def _metric(value, unit: str, reason: str | None = None, benchmark=None) -> dict:
    # 【組一項指標】值為 None 時狀態為不可用並附原因（顯示給使用者）。參數：value=值、unit=單位、reason=不可用原因、benchmark=大盤對照值
    value = _finite(value)
    return {
        "value": value, "benchmarkValue": _finite(benchmark), "unit": unit,
        "status": "available" if value is not None else "unavailable",
        "reason": None if value is not None else (reason or REASON_FEW),
    }


def _side(r, rate_d: float) -> dict:
    # 【一條報酬序列的可比較指標】組合與大盤共用同一套公式：年化波動、下行波動、最大回撤、預期短缺、夏普、索丁諾。
    # 參數：r=日報酬序列、rate_d=每日無風險利率（同時作為最低可接受報酬）
    sharpe, sharpe_reason = sharpe_ratio(r, rate_d)
    sortino, sortino_reason = sortino_ratio(r, rate_d)
    es, tail = expected_shortfall_95(r)
    return {
        "volatility": annualized_volatility(r),
        "downside": downside_daily(r, rate_d) * math.sqrt(TRADING_DAYS),
        "mdd": max_drawdown(r), "es": es, "tail": tail,
        "sharpe": sharpe, "sharpe_reason": sharpe_reason, "sortino": sortino, "sortino_reason": sortino_reason,
    }


def _figure(ref: str, reason: str | None, data=None) -> dict:
    # 【組一張圖的描述】有 reason 代表該圖無法呈現。參數：ref=圖表代號、reason=不可用原因（顯示給使用者）、data=圖表資料
    title, legend = FIGURE_TEXT[ref]
    return {"figureRef": ref, "title": title, "legendText": legend,
            "status": "unavailable" if reason else "available", "reason": reason, "data": data if not reason else None}


def compute_analysis(prices, benchmark, weights, symbols: list, names: list, dates: list, rate: float) -> dict:
    # 【計算一次風險分析】輸入同一組交易日的持股價格與大盤指數，輸出契約 AnalysisResult 中屬於計算結果的部分：
    # metrics、positions、correlation、interpretation、diagnosis、figures、dataQuality。
    # 參數：prices=價格矩陣（列為日期、欄為持股，已排序且無缺值）、benchmark=IR0001 指數值（同日期）、weights=目前市值權重、
    #       symbols／names=持股代號與名稱、dates=日期字串（與價格同長）、rate=年利率（同時作為無風險利率與最低可接受報酬）
    # 1. 報酬序列：各檔、組合（固定目前權重）、大盤
    R = np.atleast_2d(simple_returns(np.asarray(prices, dtype=float).reshape(len(dates), -1)))
    w = np.asarray(weights, dtype=float)
    rp, rm = R @ w, simple_returns(benchmark)
    n, rate_d = len(rp), daily_rate(rate)
    # 2. 組合與大盤各算一份可比較的指標
    p, m = _side(rp, rate_d), _side(rm, rate_d)
    beta, r2, beta_reason = beta_and_r_squared(rp, rm)
    g1, g1_reason = sample_skewness(rp)
    g2, g2_reason = sample_excess_kurtosis(rp)
    hhi = float(np.sum(w ** 2))
    metrics = {
        "annualized_volatility": _metric(p["volatility"], "fraction", REASON_FEW, m["volatility"]),
        "annualized_downside_deviation": _metric(p["downside"], "fraction", None, m["downside"]),
        "beta": _metric(beta, "ratio", beta_reason),
        "r_squared": _metric(r2, "ratio", beta_reason),
        "max_drawdown": _metric(p["mdd"], "fraction", None, m["mdd"]),
        "expected_shortfall_95": _metric(p["es"], "fraction", None, m["es"]),
        "skewness": _metric(g1, "ratio", g1_reason),
        "excess_kurtosis": _metric(g2, "ratio", g2_reason),
        "hhi": _metric(hhi, "fraction"),
        "effective_number_of_holdings": _metric(1.0 / hhi, "count"),
        "sharpe_ratio": _metric(p["sharpe"], "ratio", p["sharpe_reason"], m["sharpe"]),
        "sortino_ratio": _metric(p["sortino"], "ratio", p["sortino_reason"], m["sortino"]),
    }
    # 3. 風險貢獻與相關係數；組合波動兩條算法必須一致
    sigma, rc, pcr = risk_contribution(w, R)
    if p["volatility"] is not None and abs(sigma - p["volatility"]) > IDENTITY_TOL:
        raise ValueError("風險貢獻的組合波動與年化波動度不一致")
    corr = correlation_matrix(R)
    positions = [
        {"symbol": s, "name": nm, "weight": float(w[i]),
         "rc": None if rc is None else float(rc[i]), "pcr": None if pcr is None else float(pcr[i])}
        for i, (s, nm) in enumerate(zip(symbols, names))
    ]
    positions.sort(key=lambda x: (x["pcr"] is None, -(x["pcr"] if x["pcr"] is not None else x["weight"]), -x["weight"]))
    # 4. 偏態分類與索丁諾提示
    sc = skew_class(g1, n)
    interpretation = {
        "skewClass": sc,
        "sortinoPreferred": sc in ("positive_skew", "negative_skew") and p["sortino"] is not None,
        "ruleSource": RULE_SOURCE,
    }
    # 5. 四組分析與不利訊號清單
    facts = concentration_facts(list(symbols), w, pcr, corr)
    groups = [
        analyze_risk_return(p, m),
        analyze_loss_risk(p, m, g1, g2, n),
        analyze_concentration(facts),
        analyze_market(beta, r2, facts),
    ]
    # 6. 三張圖（權重對照與熱圖直接使用 positions 與 correlation）
    nav, dd = drawdown_path(rp)
    trough = int(np.argmin(dd))
    figures = [
        _figure("figure:drawdown_curve", None if n >= 2 else "資料天數太少，無法畫圖", {
            "series": [{"date": d, "navIndex": float(v), "drawdown": float(x)} for d, v, x in zip(dates, nav, dd)],
            "trough": {"date": dates[trough], "drawdown": float(dd[trough])},
        }),
        _figure("figure:weight_vs_pcr", None if pcr is not None else "這段期間組合價格沒有變動，無法拆解風險來源"),
        _figure("figure:correlation_heatmap", None if len(symbols) > 1 else "只有一檔持股，沒有可以比較的股票"),
    ]
    # 7. 資料品質提醒（顯示給使用者）
    notes = []
    if any(v is None for row in corr for v in row):
        notes.append("有持股在這段期間價格沒有變動，無法和其他股票比較，以「N/A」表示")
    return {
        "metrics": metrics,
        "positions": positions,
        "correlation": {"symbols": list(symbols), "matrix": corr},
        "interpretation": interpretation,
        "diagnosis": {"rulesVersion": DIAGNOSIS_RULES_VERSION, "groups": groups, "concentration": facts,
                      "overall": {"adverseSignals": adverse_signals(groups)}},
        "figures": figures,
        "dataQuality": {"notes": notes, "tailCount": p["tail"]},
    }
