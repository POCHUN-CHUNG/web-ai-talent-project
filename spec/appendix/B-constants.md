# 附錄 B · 常數與識別碼總表

> 本檔為 `SPEC.md` 的子文件。需要查名稱時看這裡。
> 文件版本：1.4.0 ｜ 最後更新：2026-09-21

所有識別碼在此**定義一次**，其餘章節只引用。新增任何識別碼都必須先登記於本檔。

---

## B.1 指標識別碼

`analysis_results.metrics` 的鍵，共 11 項。

| 識別碼 | 中文名稱 | 單位 | 前端顯示 |
| --- | --- | --- | :---: |
| `annualized_volatility` | 年化波動度 | `fraction` | ✓ |
| `annualized_downside_deviation` | 年化下行波動度 | `fraction` | — |
| `beta` | Beta 係數 | `ratio` | ✓ |
| `r_squared` | 決定係數 | `ratio` | — |
| `max_drawdown` | 最大回撤 | `fraction` | ✓ |
| `expected_shortfall_95` | 95% 單日預期短缺 | `fraction` | ✓ |
| `skewness` | 樣本偏態係數 | `ratio` | — |
| `excess_kurtosis` | 樣本超額峰度 | `ratio` | — |
| `hhi` | 赫芬達爾－赫希曼指數 | `fraction` | — |
| `sharpe_ratio` | 夏普比率 | `ratio` | ✓ |
| `sortino_ratio` | 索丁諾比率 | `ratio` | ✓ |

不在此表內的三項：風險貢獻度在 `positions[].rc` / `.pcr`、相關矩陣在 `correlation`、有效持股檔數由前端以 $1/HHI$ 衍生。

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

## B.3 Finding 識別碼與優先序

| 識別碼 | `priority` | 中文名稱 |
| --- | :---: | --- |
| `primary_financial_constraints` | 1 | 主要財務限制 |
| `willingness_capacity_gap` | 2 | 風險意願－能力關係 |
| `horizon_liquidity_consistency` | 3 | 投資期限－流動性一致性 |
| `knowledge_experience_consistency` | 4 | 知識－商品經驗一致性 |

AI 只解釋 `priority` 最小的前兩項，四項皆存入資料庫。

## B.4 Issue 種類

| `kind` | 觸發條件 | 導致的 `readiness` |
| --- | --- | --- |
| `experience_conflict` | Q10 與 Q11 的作答互相矛盾 | `limited` |
| `missing_answer` | 14 題中有未作答者 | `blocked` |

## B.5 圖表識別碼

| `figureRef` | 中文名稱 | 主要綁定 section |
| --- | --- | --- |
| `figure:correlation_heatmap` | 相關係數熱圖 | `diversification` |
| `figure:weight_vs_pcr` | 權重與風險貢獻對照 | `diversification` |
| `figure:drawdown_curve` | 淨值走勢與回撤 | `tail_risk` |
| `figure:risk_gap_bar` | 風險落差對照 | `personal_alignment` |

## B.6 報告段落識別碼

`ReportContent.sections[].key`，**固定六項且順序固定**。

| 順序 | `key` | 中文名稱 |
| :---: | --- | --- |
| 1 | `volatility_downside` | 波動與下行 |
| 2 | `market_sensitivity` | 市場敏感度 |
| 3 | `tail_risk` | 尾端特徵 |
| 4 | `diversification` | 分散與貢獻 |
| 5 | `performance` | 風險調整後績效 |
| 6 | `personal_alignment` | 個人條件對齊 |

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
| `PROFILE_LIMITED` | 409 | 問卷有需要確認的地方，請先回問卷修正 |
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
| `readiness` | `ready`、`limited`、`blocked` |
| `descriptionStatus` | `pending`、`ready`、`failed` |
| `analysis_reports.status` | `ready`、`failed` |
| `mode` | `saved`、`simulation` |
| `metrics[].status` | `available`、`unavailable` |
| `metrics[].unit` | `fraction`、`ratio`、`index` |
| `figures[].status` | `available`、`unavailable` |
| `facts[].availability` | `available`、`missing`、`conflicted` |
| `skewClass` | `near_symmetric`、`positive_skew`、`negative_skew`、`undetermined` |
| `performanceFocus` | `sharpe_primary`、`sortino_primary`、`both`、`undetermined`、`limited` |
| 前端分析頁狀態 | `computing`、`interpreting`、`ready`、`partial`、`failed` |
| `stock_info.market` | `上市`、`上櫃`、`指數` |

## B.9 數值常數

| 常數 | 值 | 出處 |
| --- | --- | --- |
| 年交易日數 $TD$ | `252` | P-09 |
| 零變異判定門檻 | `1e-12` | §4.1.0 步驟 4b |
| 浮點比對容差（相對） | `1e-6` | P-20 |
| 恆等式比對容差（絕對） | `1e-9` | §4.1.10 |
| 偏態分類門檻 | `0.5` | §4.1.13 |
| 偏態分類的最小樣本數 | `30` | §4.1.13 |
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
| 分析限流 | `rl:analysis:{user_id}` | 60 秒 |
| 報告重試限流 | `rl:report:{analysis_id}` | 60 秒 |
| 一般限流 | `rl:general:{user_id}` | 60 秒 |
