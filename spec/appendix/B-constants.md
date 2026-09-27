# 附錄 B · 常數與識別碼總表

> 本檔為 `SPEC.md` 的子文件。需要查名稱時看這裡。
> 文件版本：1.10.0 ｜ 最後更新：2026-09-27

所有識別碼在此**定義一次**，其餘章節只引用。新增任何識別碼都必須先登記於本檔。

---

## B.1 指標識別碼

依診斷規則文件共 14 項指標：`analysis_results.metrics` 的 12 個純量鍵，加上風險貢獻度（`positions[].rc` / `.pcr`）與相關係數矩陣（`correlation`）。「層」為診斷規則文件的前端指標層／後端診斷層；「大盤對照」✓ 者的 `benchmarkValue` 有值。

| 識別碼 | 中文名稱 | 單位 | 層 | 大盤對照 |
| --- | --- | --- | :---: | :---: |
| `max_drawdown` | 最大回撤 | `fraction` | 前端 | ✓ |
| （`positions[].pcr`） | 風險貢獻度 | `fraction` | 前端 | — |
| （`correlation`） | 相關係數熱圖 | `ratio` | 前端 | — |
| `annualized_volatility` | 年化波動度 | `fraction` | 前端 | ✓ |
| `beta` | Beta 係數 | `ratio` | 前端 | — |
| `expected_shortfall_95` | 95% 預期短缺 | `fraction` | 前端 | ✓ |
| `sharpe_ratio` | 夏普比率 | `ratio` | 前端 | ✓ |
| `sortino_ratio` | 索丁諾比率 | `ratio` | 前端 | ✓ |
| `effective_number_of_holdings` | 有效持股檔數 | `count` | 後端 | — |
| `annualized_downside_deviation` | 下行波動度 | `fraction` | 後端 | ✓ |
| `hhi` | 赫芬達爾－赫希曼指數 | `fraction` | 後端 | — |
| `r_squared` | 判定係數 | `ratio` | 後端 | — |
| `skewness` | 樣本偏態係數 | `ratio` | 後端 | — |
| `excess_kurtosis` | 樣本超額峰度 | `ratio` | 後端 | — |

後端指標不直接顯示給使用者，由系統（四組診斷）與 AI 使用。

## B.2 Fact 識別碼

`risk_profiles.facts` 的 `id`，共 17 項。

| 識別碼 | 來源題目 | 類別 |
| --- | --- | --- |
| `loss_tolerance` | Q13 | 核心指標 |
| `investment_horizon` | Q7 | 核心指標 |
| `liquidity_need` | Q8 ＋ Q4 | 核心指標 |
| `financial_capacity` | Q3 ＋ Q4 ＋ Q9 | 核心指標 |
| `cash_flow` | Q3 | 輔助 |
| `emergency_reserve` | Q4 | 輔助 |
| `withdrawal_need` | Q8 | 輔助 |
| `investment_exposure` | Q5 | 輔助 |
| `loss_impact_20pct` | Q9 | 輔助 |
| `market_decline_behavior` | Q14 | 輔助 |
| `short_term_resilience` | Q3 ＋ Q4 ＋ Q8 | 輔助 |
| `diversification_knowledge` | Q12 | 輔助 |
| `age` | Q1 | 背景 |
| `income` | Q2 | 背景 |
| `investment_goal` | Q6 | 背景 |
| `investment_experience` | Q10 | 背景 |
| `product_experience` | Q11 | 背景 |

## B.3 Finding 識別碼

| 識別碼 | 中文名稱 |
| --- | --- |
| `primary_financial_constraints` | 主要財務限制 |
| `willingness_capacity_gap` | 風險意願－能力關係 |
| `horizon_liquidity_consistency` | 投資期限－流動性一致性 |
| `knowledge_experience_consistency` | 知識－商品經驗一致性 |
| `willingness_behavior_consistency` | 承受意願－下跌反應一致性 |

五項皆存入資料庫，也全部送給 AI；AI 必須在四段解析中說明每一項。因為不做篩選，不設 `priority` 欄位（2026-09-25 移除）。

## B.3a 四段解析的段落代號與標題

| `sections[].key` | 前端標題 |
| --- | --- |
| `funding_timing` | 資金定位與時間彈性 |
| `willingness_capacity` | 承受意願與財務能力 |
| `decline_response` | 下跌反應與投資比重 |
| `knowledge_experience` | 投資知識與實務經驗 |

## B.4 作答檢查結果

| 情況 | 回應 | 是否存檔 |
| --- | --- | :---: |
| Q10 與 Q11、或 Q3 與 Q9 的作答互相矛盾 | 422 `ANSWER_CONFLICT`（附 `questionIds`） | 否 |
| 缺題或選項不合法 | 400 `INVALID_INPUT` | 否 |
| 其餘 | 201 | 是 |

（原 `issues[].kind` 與 `readiness` 已移除，2026-09-25。）

## B.5 圖表識別碼

| `figureRef` | 中文名稱 | 對應指標 |
| --- | --- | --- |
| `figure:drawdown_curve` | 回撤走勢 | 最大回撤 |
| `figure:weight_vs_pcr` | 風險貢獻度（權重與風險貢獻對照） | 風險貢獻度 |
| `figure:correlation_heatmap` | 相關係數熱圖 | 相關係數 |

`figure:risk_gap_bar`（風險落差對照）已移除（v1.9.0，D-116）。

## B.6 四組風險分析識別碼

`AnalysisResult.diagnosis.groups[].key`，**固定四項且順序固定**。規則見 `spec/04-behavior.md` §4.1.13。

| 順序 | `key` | 中文名稱 | `typicalRuleId` 範圍 |
| :---: | --- | --- | --- |
| 1 | `risk_return` | 風險與報酬 | `E1`–`E5` |
| 2 | `loss_risk` | 虧損風險 | `T1`–`T7` |
| 3 | `concentration` | 集中與分散風險 | `C1`–`C6` |
| 4 | `market_sensitivity` | 市場敏感與風險來源 | `M1`–`M8` |

未符合任何典型結構時 `typicalRuleId` 與 `typicalLabel` 皆為 `null`（不使用「混合型」，D-119）。不利訊號 `id` 共 12 種，見 §4.1.13。

原 `ReportContent.sections[].key` 六段結構（`volatility_downside` … `personal_alignment`）將於第二階段改為「四組報告＋綜合診斷」，屆時更新本節。

## B.7 錯誤碼

| 錯誤碼 | HTTP | 中文訊息範例 |
| --- | :---: | --- |
| `INVALID_INPUT` | 400 | 輸入格式不正確 |
| `UNAUTHENTICATED` | 401 | 請重新登入 |
| `INVALID_API_KEY` | 401 | 金鑰錯誤或缺少 |
| `FORBIDDEN_RESOURCE` | 403 | 沒有權限存取這筆資料 |
| `NOT_FOUND` | 404 | 找不到這筆資料 |
| `USERNAME_TAKEN` | 409 | 帳號已存在 |
| `PORTFOLIO_NAME_TAKEN` | 409 | 已有同名的投資組合 |
| `PROFILE_REQUIRED` | 409 | 請先完成風險評估問卷 |
| `ANSWER_CONFLICT` | 422 | 作答前後矛盾，請修正標示的題目後重新送出 |
| `LIMIT_EXCEEDED` | 422 | 已達數量上限 |
| `INSUFFICIENT_PRICE_DATA` | 422 | 持股的歷史價格不足，無法計算 |
| `BENCHMARK_UNAVAILABLE` | 422 | 市場基準在這段期間沒有資料 |
| `RISK_FREE_RATE_UNAVAILABLE` | 422 | 尚未取得銀行利率，無法計算 |
| `RATE_LIMITED` | 429 | 操作過於頻繁，請稍後再試 |
| `INTERNAL_ERROR` | 500 | 系統發生錯誤 |
| `AI_REPORT_FAILED` | 502 | 分析解說暫時無法產生 |
| `UPSTREAM_FETCH_FAILED` | 502 | 外部資料來源暫時無法取得 |
| `AI_NOT_CONFIGURED` | 503 | 分析解說功能尚未設定完成 |

## B.8 狀態列舉

| 欄位 | 允許值 |
| --- | --- |
| `sectionsStatus` | `pending`、`ready`、`failed` |
| `sections[].key` | `funding_timing`、`willingness_capacity`、`decline_response`、`knowledge_experience` |
| `analysis_reports.status` | `ready`、`failed` |
| `rateOption` | `zero`、`bank_average` |
| `metrics[].status` | `available`、`unavailable` |
| `metrics[].unit` | `fraction`、`ratio`、`count` |
| `figures[].status` | `available`、`unavailable` |
| `skewClass` | `near_symmetric`、`positive_skew`、`negative_skew`、`undetermined` |
| 前端分析頁狀態 | `computing`、`interpreting`、`ready`、`partial`、`failed` |
| `stock_info.market` | `上市`、`上櫃`、`指數` |

## B.9 數值常數

| 常數 | 值 | 出處 |
| --- | --- | --- |
| 年交易日數 $TD$ | `252` | P-09 |
| 零變異判定門檻 | `1e-12` | §4.1.0 步驟 4b |
| 浮點比對容差（相對） | `1e-6` | P-20 |
| 恆等式比對容差（絕對） | `1e-9` | §4.1.10 |
| 偏態分類門檻（近 0） | `0.5` | §4.1.12 |
| 偏態分類的最小樣本數 | `30` | §4.1.12 |
| 分析期間下限 | `2` 年 | D-110 |
| 利率選項預設 | `zero` | D-112 |
| 四組分析規則版本 `DIAGNOSIS_RULES_VERSION` | `2.0.0` | §4.1.13 |
| 「大致相當」範圍：風險類（年化波動、下行波動、預期短缺、\|MDD\|） | 大盤值的 ±10%（含） | D-120 |
| 「大致相當」範圍：夏普、索丁諾 | 相差 ≤ `0.1` | D-120 |
| 峰度三級：厚尾／較薄尾 | $G_2>1$／$G_2<-1$，其餘為接近常態基準 | D-121 |
| 權重集中門檻 | $HHI > 1.43/N$（等同 $N_{\text{eff}}/N < 0.7$） | D-124 |
| 高相關配對門檻（$\rho_{ij}$ 大於等於） | `0.6` | D-117 |
| 高正相關群聚 | 高相關配對占比 ≥ `0.25`，或 $\bar\rho \ge 0.6$ | D-122 |
| 低相關結構 | $\bar\rho < 0.3$ 且沒有高相關配對 | D-122 |
| 風險貢獻前 k 名 | $k=\min(3,N-1)$ | D-117 |
| RCGap 門檻（集中／低於配置） | ≥ `0.10`／≤ `-0.10`，其餘為大致相稱 | D-119 |
| 群組集中門檻（群聚成員 PCR 合計大於等於） | `0.5` | D-123 |
| R² 強／中分界 | `0.7`、`0.4` | Morningstar |
| Beta ≈ 1 區間 | `0.9`–`1.1`（含端點） | D-117 |
| ES95 分位數 | `0.05`，線性內插 | P-15 |
| 年化持有報酬的最小天數 | `30` | P-40 |
| 熱圖切換為捲動的檔數 | `20` | P-43 |
| 熱圖省略格內數值的邊長 | `28px` | P-43 |
| 熱圖固定格邊長 | `32px` | P-43 |
| 風險貢獻預設顯示名次 | `5` | D-18 |

## B.10 CSS 變數命名

`styles/tokens.css` 的變數名即 `DESIGN.md` 的 token 名，加 `--` 前綴並轉為 kebab-case。

| DESIGN.md token | CSS 變數 |
| --- | --- |
| `background` | `--background` |
| `on-surface-variant` | `--on-surface-variant` |
| `primary-500` | `--primary-500` |
| `dark-error-container` | `--dark-error-container` |

圓角、字級、間距另立前綴：

| 用途 | 變數 |
| --- | --- |
| 卡片圓角 | `--radius-card`（30px） |
| 輸入框圓角 | `--radius-input`（30px） |
| 按鈕圓角 | `--radius-button`（25px） |
| 巢狀卡圓角 | `--radius-nested`（20px） |
| 全圓角 | `--radius-full`（9999px） |
| 間距 | `--space-xs` / `-sm` / `-md` / `-lg` / `-xl` / `-2xl` / `-3xl` |
| 字級 | `--type-headline-display` / `-lg` / `-md` / `-sm`、`--type-body-lg` / `-md` / `-sm`、`--type-label-lg` / `-md` / `-sm` |
| 陰影 | `--elevation-1` 至 `--elevation-5` |

**除 `tokens.css` 外，任何檔案不得出現色碼字面值**（驗收項 G1）。

## B.11 Redis 鍵命名

| 用途 | 鍵 | TTL |
| --- | --- | --- |
| 登入通行證 | `session:{token}` | 7 天 |
| 使用者的通行證清單 | `user_sessions:{user_id}` | 7 天 |
| 分析結果快取 | `analysis:{analysis_id}` | 24 小時 |
| 登入限流 | `rl:auth:{ip}` | 60 秒 |
| 問卷送出限流 | `rate:questionnaire:{user_id}` | 60 秒 |
| 重新產生解析限流 | `rate:sections:{user_id}` | 60 秒 |
| 解析產生中標記 | `sections_pending:{profile_id}` | `OPENAI_MAX_ATTEMPTS × OPENAI_TIMEOUT_SECONDS` ＋ 重試間隔 ＋ 60 秒（預設 247 秒） |
| 報告重試限流 | `rl:report:{analysis_id}` | 60 秒 |
| 一般限流 | `rl:general:{user_id}` | 60 秒 |
