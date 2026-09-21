# 附錄 D · 資料來源與參考文獻

> 本檔為 `SPEC.md` 的子文件。回答「這個公式／規則／資料是哪來的」時看這裡。
> 文件版本：1.3.0 ｜ 最後更新：2026-09-21

**本附錄的核心用途是區分三件事**：哪些是學界或業界的既有定義、哪些是監理機關的要求、哪些是本專題自行建立的規則。專題書面與口試答辯時，第三類**絕對不能說成前兩類**。

---

## D.1 引用可信度說明

| 標記 | 意義 |
| --- | --- |
| ✅ 已驗證 | 本次撰寫規格時實際取得來源並確認內容 |
| ⚠️ 需自行查證 | 依既有知識記述，**書面引用前請自行查證年份、卷期與頁碼** |

標記 ✅ 者為本次實際查證（期刊頁面、DOI 或發行機構原始文件）後確認的卷期與頁碼；標記 ⚠️ 者依既有知識記述。下列文獻與資料來源，凡標記 ⚠️ 者請在正式書面中自行核對出處。規格文件本身不因引用而改變任何計算規則——公式已在 `spec/04-behavior.md` §4.1 明確定義，文獻只是說明「為什麼這樣定義」。

---

## D.2 量化指標的理論來源

### D.2.0 與舊版指標表的比對結果

柏鈞提供的舊版「量化技術指標參考資料表」（8 列）經逐項查證，**文獻選擇大體正確**，但有三處引用需要更精準、四處與本規格的實際計算不一致。以下為查核結果，**本表列的是舊文件的內容，不是本系統的規範**；本系統一律以 §D.2.1 的對照表為準。

#### 引用需要修正之處

| # | 舊版寫法 | 問題 | 應改為 |
| --- | --- | --- | --- |
| A-1 | 年化波動度 → Markowitz (1952) | Markowitz 建立的是投資組合變異數的矩陣形式，**沒有提出 $\times\sqrt{252}$ 的年化方法** | 矩陣形式引 Markowitz (1952)；年化引「平方根時間法則」（無單一原始文獻，源自布朗運動下變異數與時間成正比的性質） |
| A-2 | Beta → Sharpe (1964) | Sharpe (1964) 是 **CAPM 的均衡定價理論**；本系統用的是迴歸估計的單一指數模型 | 估計式引 Sharpe (1963)《A Simplified Model for Portfolio Analysis》，*Management Science* 9(2), 277–293；理論意義才引 Sharpe (1964) |
| A-3 | VaR → BCBS (1996)，標題寫「市場風險資本協定修正案」 | 正式英文標題不同，且應註明為 1996 年 1 月版 | Basel Committee on Banking Supervision (1996). *Amendment to the Capital Accord to Incorporate Market Risks*. BIS, January 1996（文件編號 bcbs23） |

#### 與本規格計算不一致之處

| # | 舊版寫法 | 本規格實際做法 | 裁示依據 |
| --- | --- | --- | --- |
| B-1 | 使用**日對數報酬率** $\ln(P_t/P_{t-1})$ | 使用**簡單報酬率** $P_t/P_{t-1}-1$ | §4.1.0。理由見下方「為什麼用簡單報酬」 |
| B-2 | 列有 **VaR**（95%／99%） | 14 項指標**不含 VaR**，只有 ES95 | D-55、`SPEC.md` §1.5 |
| B-3 | 列有**分散比率 Diversification Ratio** | 14 項指標**不含 DR**，分散效果改以 HHI、$N_{eff}$、相關係數矩陣與 RC 呈現 | D-55、`SPEC.md` §1.5 |
| B-4 | 夏普比率的 $R_f$ 取**臺銀**一年期定存利率 | 取**五家公股銀行**一年期定存機動利率的**算術平均** | D-06 |
| B-5 | 索丁諾比率的 MAR 未明示 | $MAR = R_f$，且分子與分母同門檻 | D-10 |

**舊版正確且與本規格一致的部分**（不需修改）：

- CVaR／ES 引 Rockafellar & Uryasev (2000) — 正確，且該文正是把 CVaR 寫成可最佳化形式的原始文獻。
- 動態最大回撤引 Chekhlov, Uryasev & Zabarankin (2005) — 正確，該文提出 CDaR（Conditional Drawdown-at-Risk），是把回撤形式化為風險測度的代表作。
- 分散比率引 Choueifaty & Coignard (2008) — 正確，DR 的原始提出者。
- 索丁諾的下行偏離寫成 $\sigma_d=\sqrt{\frac{1}{N}\sum \min(0, R_{p,t}-R_f)^2}\times\sqrt{252}$ — **與 D-10 完全一致**，分母為全體樣本數 $N$ 而非低於門檻的天數，這點舊版寫對了。
- CVaR 的正負號約定與本系統一致。

#### 為什麼用簡單報酬而不是對數報酬

| 考量 | 簡單報酬 | 對數報酬 |
| --- | --- | --- |
| 跨標的加權 | $R_p=\sum w_i R_i$ **成立** | 不成立（對數報酬不可線性加權） |
| 跨時間累乘 | 需 $\prod(1+R)$ | 可直接相加 |
| 淨值序列與 MDD | 直接對應真實帳戶價值 | 需先還原 |
| 使用者理解 | 「跌 10%」即字面意義 | 需額外解釋 |

本系統要計算**投資組合層級**的 $R_p$、$\sigma_p$、Beta、RC 與相關係數矩陣，全部依賴 $R_p=\sum w_i R_i$ 這條線性關係，因此**必須**用簡單報酬。若改用對數報酬，§4.1.10 的歐拉分解恆等式 $\sum_i RC_i=\sigma_p$ 將不再成立。這不是偏好問題，是數學上的必要條件。

---

### D.2.1 十四項指標的逐項出處對照

| # | 指標 | 公式位置 | 主要來源 | 標記 |
| --- | --- | --- | --- | --- |
| 1 | 年化報酬率 | §4.1.1 | 幾何年化（複利）標準做法，無單一原始文獻 | — |
| 2 | 年化波動度 $\sigma_p$ | §4.1.2 | 組合變異數矩陣形式：Markowitz (1952)<br>年化：平方根時間法則 | ⚠️ |
| 3 | 年化下行波動度 $DD$ | §4.1.3 | Sortino & Price (1994)；門檻一致性依 Rollinger & Hoffman (2013) | ⚠️ |
| 4 | Beta | §4.1.4 | Sharpe (1963) 單一指數模型（估計式）<br>Sharpe (1964) CAPM（理論意義） | ✅ 已查證卷期頁碼 |
| 5 | $R^2$ | §4.1.4 | 最小平方法標準性質：單因子含截距時 $R^2=\mathrm{Corr}(R_p,R_m)^2$ | — |
| 6 | 最大回撤 $MDD$ | §4.1.5 | 業界通用路徑相依指標，無單一原始文獻<br>形式化為風險測度：Chekhlov, Uryasev & Zabarankin (2005) | ✅ 已查證 DOI |
| 7 | 95% 預期短缺 $ES_{95}$ | §4.1.6 | Rockafellar & Uryasev (2000)（CVaR 最佳化形式）<br>連貫性論證：Artzner et al. (1999)<br>分位數 type 7：Hyndman & Fan (1996) | ✅ 已查證卷期 |
| 8 | 樣本偏態 $G_1$ | §4.1.7 | Joanes & Gill (1998) | ⚠️ |
| 9 | 樣本超額峰度 $G_2$ | §4.1.8 | Joanes & Gill (1998) | ⚠️ |
| 10 | $HHI$ | §4.1.9 | Hirschman (1945)／Herfindahl (1950)；美國司法部反托拉斯指引採用 | ⚠️ |
| 11 | 有效持股檔數 $N_{eff}$ | §4.1.9 | $1/HHI$，HHI 的標準倒數轉換 | — |
| 12 | 風險貢獻 $RC_i$ 與 $PCR_i$ | §4.1.10 | 歐拉分解：Litterman (1996)；Maillard, Roncalli & Teïletche (2010) | ⚠️ |
| 13 | 相關係數矩陣 | §4.1.11 | Pearson 積差相關，統計學標準定義 | — |
| 14 | 夏普比率 | §4.1.12 | Sharpe (1966)；修訂版 Sharpe (1994) | ⚠️ |
| 14 | 索丁諾比率 | §4.1.12 | Sortino & Price (1994)；$MAR=R_f$ 依 Rollinger & Hoffman (2013) | ⚠️ |

> 指標編號依 §4.1 的小節順序，夏普與索丁諾同列第 14 項（共同構成「風險調整後績效」）。計數方式見 `SPEC.md` §1.3 FR-21。

---

### D.2.2 完整文獻清單

#### 報酬與波動

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| 投資組合報酬與變異數的矩陣形式、分散效果 | Markowitz, H. (1952). *Portfolio Selection*. The Journal of Finance, 7(1), 77–91. | ⚠️ |
| 年化波動度 $\sigma_{daily}\sqrt{252}$ | 平方根時間法則（square-root-of-time rule），假設日報酬獨立同分布。**此假設在實務上不成立**，厚尾與波動叢聚會讓年化值低估真實風險，規格因此要求搭配 ES 與 MDD 一起解讀。此法則亦為 BCBS (1996) 允許以 10 日持有期換算的依據 | — |
| 樣本標準差採 `ddof=1`（貝索校正） | 統計學標準做法，使樣本變異數成為母體變異數的不偏估計 | — |

#### 風險調整後績效

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| 夏普比率 | Sharpe, W. F. (1966). *Mutual Fund Performance*. The Journal of Business, 39(1), 119–138.<br>Sharpe, W. F. (1994). *The Sharpe Ratio*. The Journal of Portfolio Management, 21(1), 49–58. | ⚠️ |
| 索丁諾比率與下行偏離 | Sortino, F. A., & Price, L. N. (1994). *Performance Measurement in a Downside Risk Framework*. The Journal of Investing, 3(3), 59–64. | ⚠️ |
| **分子與分母必須採同一門檻** | Rollinger, T., & Hoffman, S. (2013). *Sortino: A Sharpe Ratio Framework*. Red Rock Capital. | ⚠️ |

**Rollinger & Hoffman 是 D-10（$MAR = R_f$）的直接依據。** 該文指出「分子扣 $R_f$、分母門檻用 0」是實務上常見的誤用，因為 Sortino 的定義要求兩者為同一目標報酬。本系統據此將 $MAR$ 設為 $R_f$，並改寫下行偏離公式。

**下行偏離的分母為 $n$（全體樣本）而非「低於門檻的天數」**，亦出自 Sortino 的原始定義。這是最常被寫錯的一點，`spec/04-behavior.md` §4.1.3 已列為三個易錯點之一。

#### 尾端風險

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| CVaR／ES 的定義與可最佳化形式 | Rockafellar, R. T., & Uryasev, S. (2000). *Optimization of Conditional Value-at-Risk*. The Journal of Risk, 2(3), 21–41. | ✅ 已查證 |
| 預期短缺為連貫風險測度，VaR 不是 | Artzner, P., Delbaen, F., Eber, J.-M., & Heath, D. (1999). *Coherent Measures of Risk*. Mathematical Finance, 9(3), 203–228. | ⚠️ |
| 分位數估計的九種方法與 type 7 定義 | Hyndman, R. J., & Fan, Y. (1996). *Sample Quantiles in Statistical Packages*. The American Statistician, 50(4), 361–365. | ⚠️ |
| VaR 的監理制度化 | Basel Committee on Banking Supervision (1996). *Amendment to the Capital Accord to Incorporate Market Risks*. BIS, January 1996. | ✅ 已查證標題 |
| 監理標準由 VaR 轉向 ES | Basel Committee on Banking Supervision (2016/2019). *Minimum Capital Requirements for Market Risk*（FRTB）。以 97.5% ES 取代 99% VaR 作為市場風險資本計提基礎 | ⚠️ |

> **頁碼註記**：Rockafellar & Uryasev (2000) 的結束頁在不同二手來源有 41 與 42 兩種寫法。以 *The Journal of Risk* 官方收錄（risk.net）為準，書面引用建議寫 21–41，並以 DOI 或期刊頁面為最終依據。

**本系統選用 ES 而非 VaR**（D-55），三個理由：

1. ES 具次可加性（分散投資不會讓風險測度變大），VaR 沒有——這與本系統「說明分散效果」的核心目的直接相關（Artzner et al. 1999）。
2. VaR 只回答「多少機率不會虧超過 X」，**完全不描述超過之後虧多少**；ES 回答的正是尾端的平均損失，對投資新手更有解釋力。
3. Basel 的 FRTB 已將市場風險資本計提由 99% VaR 改為 97.5% ES，監理方向與本選擇一致。

**分位數採 type 7（線性內插）**，即 NumPy 與 R 的預設值。P-15 明確指定此方法，因為九種方法在小樣本下結果明顯不同。

#### 分布形狀

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| $G_1$、$G_2$ 與 $b_1$、$b_2$、$g_1$、$g_2$ 的定義與換算關係 | Joanes, D. N., & Gill, C. A. (1998). *Comparing Measures of Sample Skewness and Kurtosis*. Journal of the Royal Statistical Society: Series D, 47(1), 183–189. | ⚠️ |

**這是 §4.1.7「禁止使用 `scipy.stats.skew`」的依據。** 該文整理了三組偏態與峰度估計量：$b_1$（母體動差，SciPy 與 NumPy 預設）、$g_1$、$G_1$（不偏估計，Excel 與 SAS 的 `SKEW` 採用）。本系統採 $G_1$ 與 $G_2$，與指標說明書原始定義一致。兩者比值為 $\sqrt{n(n-1)}/(n-2)$，黃金向量 V8 即驗證此關係。

**超額峰度的常態參考值為 0**（已減去 3），不是 Pearson 峰度的 3。

#### 集中度與風險分解

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| 赫芬達爾—赫希曼指數 | Hirschman, A. O. (1945) 與 Herfindahl, O. C. (1950) 的產業集中度測度，後由美國司法部反托拉斯指引採用 | ⚠️ |
| 有效持股檔數 $N_{eff} = 1/HHI$ | HHI 的倒數轉換，等於「等權持有幾檔的集中程度」 | — |
| 風險貢獻度的歐拉分解 $\sum_i RC_i = \sigma_p$ | Litterman, R. (1996). *Hot Spots and Hedges*. The Journal of Portfolio Management, 22(5), 52–75.<br>Maillard, S., Roncalli, T., & Teïletche, J. (2010). *The Properties of Equally Weighted Risk Contribution Portfolios*. The Journal of Portfolio Management, 36(4), 60–70. | ⚠️ |
| 分散比率 $DR$（**本系統未採用**，僅供比較） | Choueifaty, Y., & Coignard, Y. (2008). *Toward Maximum Diversification*. The Journal of Portfolio Management, 35(1), 40–51. | ⚠️ |

**歐拉分解是 §4.1.10 那條恆等式的來源**：因為 $\sigma_p(w)$ 是 $w$ 的一次齊次函數，由歐拉定理可得 $\sigma_p = \sum_i w_i \frac{\partial \sigma_p}{\partial w_i}$。這也解釋了為什麼 $RC_i$ 可以為負——偏導數在負相關的情況下可以是負的，那是真實的抵銷效果，不是計算錯誤。

**為什麼不採用分散比率**：$DR=\frac{\sum_i w_i\sigma_i}{\sigma_p}$ 只給出一個無單位的純量，無法指出「是哪一檔造成集中」。本系統改以 $HHI$／$N_{eff}$（權重集中度）＋ 相關係數矩陣（兩兩連動）＋ $RC_i$／$PCR_i$（個別標的的風險貢獻）三者並列，資訊量涵蓋 DR 且可直接對應到畫面上的個股。若後續要補上 DR，僅需權重、個別波動度與 $\sigma_p$，皆為既有中間值。

#### 市場模型

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| 單一指數模型（Beta 的迴歸估計式） | Sharpe, W. F. (1963). *A Simplified Model for Portfolio Analysis*. Management Science, 9(2), 277–293. DOI: 10.1287/mnsc.9.2.277 | ✅ 已查證 |
| Beta 的理論意義（系統性風險定價） | Sharpe, W. F. (1964). *Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk*. The Journal of Finance, 19(3), 425–442. | ⚠️ |
| 單因子含截距時 $R^2 = \text{Corr}(R_p, R_m)^2$ | 最小平方法的標準性質 | — |

**為什麼要分成兩篇引**：本系統計算的 $\beta=\frac{\mathrm{Cov}(R_p,R_m)}{\mathrm{Var}(R_m)}$ 是**統計估計量**，來自 Sharpe (1963) 的單一指數模型（市場模型）。Sharpe (1964) 的 CAPM 則是在均衡假設下推導 $E(R_i)=R_f+\beta_i[E(R_m)-R_f]$，是**定價理論**。只引 1964 會讓人誤以為本系統在檢驗 CAPM——本系統並沒有，只是估計相對市場的敏感度。

#### 最大回撤

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| 回撤的風險測度化（CDaR／Drawdown Measure） | Chekhlov, A., Uryasev, S., & Zabarankin, M. (2005). *Drawdown Measure in Portfolio Optimization*. International Journal of Theoretical and Applied Finance, 8(1), 13–58. DOI: 10.1142/S0219024905002767 | ✅ 已查證 |

MDD 本身沒有單一權威文獻，是業界通用的路徑相依風險指標；Chekhlov et al. 是把它形式化為可最佳化風險測度的代表作，但**本系統只計算 MDD 這個純量，並未實作 CDaR**，書面引用時須說明此差異。本系統採最常見的定義：以日報酬累乘構成淨值序列，計算每一時點相對於歷史高點的跌幅，取最小值。$V_0 = 1$ 納入高點計算，因此 $MDD \le 0$ 恆成立。

---

## D.3 問卷的設計來源

### 學術依據

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| 金融風險承受度為多構面建構，不應以單一問題代表 | **Grable, J. E., & Lytton, R. H. (1999). *Financial Risk Tolerance Revisited: The Development of a Risk Assessment Instrument*. Financial Services Review, 8(3), 163–181.** | ✅（柏鈞提供） |

該研究以多階段程序發展出 13 題的多構面量表（Financial Risk Tolerance Assessment Instrument）。本問卷承接其**多構面**的核心主張，但**題目與計分方式皆為本專題自行設計**。

> ⚠️ **不得宣稱**本問卷沿用 Grable & Lytton 量表或繼承其信效度。自行修改題目與建立分類規則後，原量表的信效度不會自動移轉。

### 業界依據：八家銀行的 KYC 問卷

問卷題目的設計參考了下列八家台灣金融機構的客戶風險屬性評估（KYC）問卷：

| # | 機構 |
| --- | --- |
| 1 | 中國信託銀行 |
| 2 | 元大銀行 |
| 3 | 匯豐銀行 |
| 4 | 台北富邦銀行 |
| 5 | 台新銀行 |
| 6 | 國泰世華銀行 |
| 7 | 彰化銀行 |
| 8 | 玉山銀行 |

從中歸納出台灣實務上共通的評估構面，並對應到本問卷的題號：

| 共通構面 | 對應題號 |
| --- | --- |
| 年齡與生命階段 | Q1 |
| 所得水準 | Q2 |
| 現金流與償債狀況 | Q3 |
| 緊急預備金 | Q4 |
| 投資占可動用資產比例 | Q5 |
| 投資目的 | Q6 |
| 投資期限 | Q7 |
| 短期資金需求 | Q8 |
| 損失承受能力（情境式） | Q9 |
| 投資經驗年數 | Q10 |
| 商品經驗 | Q11 |
| 金融知識測驗 | Q12 |
| 可接受損失幅度 | Q13 |
| 市場下跌時的行為反應 | Q14 |

> ⚠️ 各機構問卷的題目文字與選項為其各自所有。本問卷為**參考共通構面後自行撰寫**，非任何一家之複製或改寫。書面引用時應寫「參考國內主要金融機構之客戶風險屬性評估問卷所共同涵蓋之評估構面」，不逐一列舉為引用來源。

### 監理依據

| 項目 | 來源 | 標記 |
| --- | --- | --- |
| 綜合評估財務背景、所得與資金來源、風險偏好、投資經驗、契約目的與需求 | 金融監督管理委員會《金融服務業確保金融商品或服務適合金融消費者辦法》第 4 條 | ⚠️ |
| 客戶投資輪廓應綜合多項因素，不依單一分數判定 | FINRA Rule 2111（Suitability）之 customer investment profile factors | ⚠️ |
| 風險意願（willingness）與風險承受能力（ability／capacity）須分開評估；投資期限與流動性需求為獨立構面 | CFA Institute — Investment Risk Profiling；Basics of Portfolio Planning and Construction | ⚠️ |
| Risk Capacity 受緊急預備金、外部收入等資源影響 | CFA Institute — Investment Risk Profiling | ⚠️ |
| 市場情境下的實際行為與長期風險意願須分開理解 | CFA Research Foundation — Risk Profiling through a Behavioral Finance Lens | ⚠️ |

**CFA 的 willingness／capacity 二分是 D-14 的直接依據**：分析前的確認彈窗只開放意願類欄位（可接受損失區間、投資期限）微調，財務承受能力與流動性需求鎖死。

---

## D.4 本專題自行建立的規則

**以下全部沒有官方來源，不得宣稱為 CFA、FINRA 或金管會的公式。** 它們的共通特性是「概念有文獻支持，具體門檻與組合方式由本專題訂定」。

| 規則 | 定義位置 | 概念依據 | 自訂的部分 |
| --- | --- | --- | --- |
| 財務風險承受能力 = $\min(Q3, Q4, Q9)$ | §4.2.2 | CFA：重大財務限制不應被其他條件抵銷 | 非補償式 MIN 公式、三題的三級分界 |
| 資金流動性需求的 Q4 × Q8 矩陣 | §4.2.2 | CFA：緊急預備金影響 Risk Capacity | 25 格的具體分級，含「預備金不足 1 個月 → 至少高」的下限規則 |
| 投資期限－流動性一致性矩陣 | §4.2.3 | CFA：Goal Time Horizon 與 Need for Liquidity 為獨立構面 | 25 格的一致／需注意／衝突判定 |
| 風險意願－能力關係矩陣 | §4.2.3 | CFA：willingness vs. capacity | 9 格的五種關係，以及 Q13 簡化為三級的切點（A/B → 低、C → 中、D/E → 高） |
| 短期財務韌性的四級 MIN 規則 | §4.2.2 | CFA：cash savings、outside income、liquidity needs | 四級分界與 Q3＋Q4＋Q8 的組合方式 |
| 主要財務限制的 11 個觸發條件 | §4.2.3 | FINRA／金管會：綜合多項因素 | 每一個觸發門檻 |
| 偏態分類門檻 $\lvert G_1 \rvert < 0.5$ | §4.1.13 | 統計學常見經驗判準 | 以 0.5 作為切點、以 $n \ge 30$ 作為可判定的最小樣本 |
| 零變異判定門檻 $\sigma < 10^{-12}$ | §4.1.0 | 浮點數運算的實務需求 | 門檻數值 |
| 年化持有報酬率的 30 日下限 | P-40 | 短期報酬年化會產生誤導性數字 | 30 日這個切點 |
| 風險貢獻預設顯示前 5 名 | D-18 | 介面可讀性 | 5 這個數字 |

### 方法論定位的建議寫法

> 本系統為一套以既有金融風險理論與監理要求為基礎所建立的**透明規則式風險屬性評估原型**。其中的量化指標定義採用學界既有公式；風險屬性的構面劃分參考 CFA Institute 的 Investment Risk Profiling 架構、FINRA 適合度制度與金管會適合度規範；問卷構面參考國內主要金融機構之客戶風險屬性評估問卷，並以 Grable & Lytton (1999) 關於金融風險承受度應為多構面評估的主張為理論支持。
>
> 其中的具體分級門檻、非補償式組合公式與交叉分析矩陣**均為本專題自行建立之模型**，尚未經過 Pilot Test、專家審查或實證資料驗證，不具備任何官方認證。

**不得寫**：本問卷通過 CFA／FINRA／金管會認證；MIN 公式為 CFA 官方公式；本問卷沿用 Grable & Lytton 量表。

---

## D.5 資料來源

| 資料 | 來源 | 取得方式 | 備註 |
| --- | --- | --- | --- |
| 個股與 ETF 日收盤價 | yfinance | 由後端 `services/market_data.py` 抓取（D-56） | 一律取 `Adj Close`（已還原除權息）。非官方 API，可能中斷（R-03） |
| 市場基準 IR0001 | 臺灣證券交易所《發行量加權股價報酬指數》 | `https://www.twse.com.tw/rwd/zh/TAIEX/MFI94U?response=json&date=YYYYMM01` | ✅ 已驗證回傳結構。一次一個月；日期為民國年；數值含千分位逗號 |
| 股票基本資料 | 臺灣證券交易所 ISIN 分類表 | `https://isin.twse.com.tw/isin/class_main.jsp?market={m}&issuetype={i}` | ✅ 由後端 `services/stock_info.py` 抓取（D-56）。四組參數涵蓋上市普通股（含 KY）、上櫃普通股、上市 ETF、上櫃 ETF |
| 無風險利率 | 五大公股銀行牌告 1 年期定期存款機動利率 | 由後端 `services/bank_rates.py` 爬取 | ✅ 現況已實作。臺灣銀行、合作金庫、土地銀行、華南銀行、第一銀行 |

**為什麼市場基準用報酬指數 IR0001 而非價格指數 IX0001**（D-23）：個股報酬取自 `Adj Close`（含息），若對上不含息的價格指數，Beta 的分子分母定義不一致，超額報酬會被系統性高估約 3–4%／年（台股年化殖利率水準）。

**為什麼無風險利率用定存利率而非公債殖利率**：台灣一般投資人的「無風險替代方案」實務上就是銀行定存，而非買入公債。此選擇偏向使用者的實際決策情境，但**與國際慣例（短天期公債）不同**，書面中應說明此差異。

---

## D.6 技術標準與工具

| 項目 | 來源 |
| --- | --- |
| 無障礙標準 | W3C《Web Content Accessibility Guidelines (WCAG) 2.2》，符合層級 AA |
| 色盲安全性檢驗 | 以 OKLab 色差（ΔE）計算 deutan／protan／tritan 三種色覺缺陷下的相鄰色對分離度，目標值 ΔE ≥ 8 |
| 日期時間格式 | ISO 8601 |
| Commit 訊息格式 | Conventional Commits |
| API 錯誤語意 | RFC 9110（HTTP Semantics）的狀態碼定義 |
| 密碼儲存 | Argon2id（Password Hashing Competition 2015 優勝演算法） |
| 密碼政策的現代建議 | NIST SP 800-63B — 重長度而非複雜度。**本版未採用**（D-19 維持現況），列為 R-02 |

---

## D.7 規格文件自身的方法論

| 項目 | 來源 |
| --- | --- |
| 規格結構（七層、ID 制度、驗收清單、黃金向量） | Anthropic `system-spec-writer` skill |
| 圖表設計方法（形式選擇、色彩四職能、六項檢查、互動層） | Anthropic `dataviz` skill |
| 設計系統 | 專案根目錄 `DESIGN.md`（Glass Console），由 `design-md-builder` 產生 |
| 開發流程規範 | 專案根目錄 `CLAUDE.md` |
