# 03 · 契約層

> 本檔為 `SPEC.md` 的子文件。閱讀前必須先讀 `SPEC.md` 的 §0 協議層與 §0.3 詞彙表。
> 文件版本：1.7.0 ｜ 最後更新：2026-09-21

本層定義資料模型、資料庫結構、API 契約、狀態機、外部整合與 AI 模型契約。**動到任何資料結構或 API 之前必須先改本檔，再改程式。**

---

## 3.1 資料模型

### 通用型別約定

| 概念 | 型別 | 規範 |
| --- | --- | --- |
| 時間戳 | `string` | ISO 8601、UTC、結尾 `Z`。例 `2026-09-20T07:30:00Z` |
| 日期 | `string` | `YYYY-MM-DD`，台北時區的日曆日 |
| 金額與價格 | `string` | **以字串傳遞十進位數**，例 `"1190.0000"`。禁止用 JSON number 傳遞，避免 IEEE 754 誤差 |
| 比率與指標 | `number` | 小數表示，`0.25` 代表 25%。前端負責乘 100 與格式化 |
| 代號 | `string` | 純代號，不含市場後綴 |

**金額用字串、指標用數字**是刻意的分界：金額涉及使用者的錢，必須精確；指標是統計量，本身就有估計誤差，浮點數足夠。

### 核心實體

```ts
type StockInfo = {
  symbol: string;        // 純代號，主鍵。例 "2330"、"0050"、"IR0001"
  name: string;          // 有價證券名稱，≤ 40 字
  market: string;        // "上市" | "上櫃" | "指數"
  industry: string;      // 產業別，ETF 與指數亦有值
  updated: string;       // 最後更新時間
};

type DailyQuote = {
  symbol: string;
  adjClose: string;      // 還原除權息後的收盤價；指數為報酬指數收盤值
  tradeDate: string;     // 交易日
};

type BankRates = {       // 全表永遠只有一列
  taiwanBank: string;
  tcbBank: string;
  landBank: string;
  huananBank: string;
  firstBank: string;
  updated: string;
};

type Portfolio = {
  id: number;
  name: string;          // 1–30 字
  created: string;
  updated: string;
};

type HoldingLot = {        // 一筆買進紀錄
  id: number;
  portfolioId: number;
  symbol: string;
  tradeDate: string;     // 買進日期
  quantity: string;      // 股數，支援零股
  unitCost: string;      // 每股價格
  created: string;
  updated: string;
};

type Position = {        // 由 holding_lots 即時彙總，不落表
  symbol: string;
  name: string;
  quantity: string;      // Σ 股數
  averageCost: string;   // Σ(股數×單價) ÷ Σ股數
  costAmount: string;    // Σ(股數×單價)
  latestPrice: string | null;   // 最新 adjClose；該檔無任何報價時為 null
  latestPriceDate: string | null;
  marketValue: string | null;   // 股數 × 最新價；無報價時為 null
  unrealizedPnl: string | null; // 市值 − 投入成本；無報價時為 null
  unrealizedReturn: number | null;
  holdingDays: number;          // 以投入成本加權的平均持有日曆天數
  annualizedReturn: number | null;  // 持有天數 < 30 時為 null
  weight: number | null; // 目前市值權重；只要組合內有任一檔無報價，全部檔的權重皆為 null（權重須加總為 1）
  lots: PositionLot[];   // 展開用
};

type PositionLot = HoldingLot & {  // 買進紀錄加上該筆的損益資料（C10）
  costAmount: string;    // 股數 × 單價
  marketValue: string | null;
  unrealizedPnl: string | null;
  unrealizedReturn: number | null;
  holdingDays: number;   // 今日 − tradeDate（日曆日，台北時區）
};
```

### 風險屬性

```ts
type RiskProfile = {
  id: number;
  questionnaireAnswerId: number;
  readiness: "ready" | "limited" | "blocked";
  coreIndicators: {
    lossTolerance: "未滿5%" | "5%～10%" | "10%～20%" | "20%～30%" | "30%以上";
    investmentHorizon: "1年以內" | "1～3年" | "3～5年" | "5～10年" | "10年以上";
    liquidityNeed: "極高" | "高" | "中等" | "低";
    financialCapacity: "低" | "中等" | "高";
  };
  facts: Fact[];
  findings: Finding[];
  issues: Issue[];
  description: string | null;            // AI 產生的風險屬性描述
  descriptionStatus: "ready" | "failed" | "pending";
  created: string;
};

type Fact = {
  id: string;            // 見下方 fact id 清單
  label: string;         // 顯示名稱
  valueText: string;     // 原始區間文字，不轉成數字
  availability: "available" | "missing" | "conflicted";
  sourceQuestionIds: string[];   // 例 ["Q3","Q4","Q9"]
  basisFactIds: string[];
};

type Finding = {
  id: string;
  priority: 1 | 2 | 3 | 4;
  statement: string;
  factIds: string[];
};

type Issue = {
  id: string;
  kind: "experience_conflict" | "missing_answer";
  description: string;
  affectedFactIds: string[];
};
```

**Fact id 固定清單**（17 項）：

`loss_tolerance`、`investment_horizon`、`liquidity_need`、`financial_capacity`、`cash_flow`、`emergency_reserve`、`withdrawal_need`、`investment_exposure`、`loss_impact_20pct`、`market_decline_behavior`、`short_term_resilience`、`diversification_knowledge`、`age`、`income`、`investment_goal`、`investment_experience`、`product_experience`。

**Finding id 與 priority 固定對應**（P-33）：

| id | priority |
| --- | :---: |
| `primary_financial_constraints` | 1 |
| `willingness_capacity_gap` | 2 |
| `horizon_liquidity_consistency` | 3 |
| `knowledge_experience_consistency` | 4 |

### 分析結果

```ts
type AnalysisResult = {
  id: number;
  portfolioId: number;
  riskProfileId: number;
  readiness: "ready" | "limited" | "blocked";
  mode: "saved" | "simulation";
  changedFields: string[];        // simulation 時列出被微調的欄位
  period: {
    requestedYears: number;       // 1–10
    effectiveYears: number;
    startDate: string;
    endDate: string;
    tradingDays: number;
    limitedBySymbols: string[];   // 造成期間限縮的代號；無限縮時為空陣列
    annualizationBasis: 252;
    weightingMethod: "current_market_value";
    benchmarkSymbol: string;      // IR0001
  };
  settings: {
    riskFreeRate: number;         // 年利率小數，例 0.0166
    rateAsOf: string;             // bank_rates.updated
    mar: number;                  // 本版等於 riskFreeRate
  };
  metrics: Record<MetricId, Metric>;
  positions: AnalysisPosition[];
  correlation: {
    symbols: string[];            // 順序即矩陣索引順序
    matrix: (number | null)[][];  // 對稱方陣，缺值為 null，不得填 0
  };
  interpretation: {
    skewClass: "near_symmetric" | "positive_skew" | "negative_skew" | "undetermined";
    performanceFocus: "sharpe_primary" | "sortino_primary" | "both" | "undetermined" | "limited";
    ruleSource: string;
  };
  findings: Finding[];
  figures: Figure[];
  dataQuality: {
    notes: string[];
    excludedSymbols: string[];
  };
  created: string;
};

type MetricId =
  | "annualized_volatility"
  | "annualized_downside_deviation"
  | "beta"
  | "r_squared"
  | "max_drawdown"
  | "expected_shortfall_95"
  | "skewness"
  | "excess_kurtosis"
  | "hhi"
  | "sharpe_ratio"
  | "sortino_ratio";

type Metric = {
  value: number | null;
  unit: "fraction" | "ratio" | "index";
  status: "available" | "unavailable";
  reason: string | null;          // status 為 unavailable 時必填
  sampleId: string;               // 共同樣本識別，同一次分析內所有指標相同
};

type AnalysisPosition = {
  symbol: string;
  name: string;
  weight: number;
  rc: number | null;              // 風險貢獻度，年化
  pcr: number | null;             // 風險貢獻比例
};

type Figure = {
  figureRef:
    | "figure:correlation_heatmap"
    | "figure:weight_vs_pcr"
    | "figure:drawdown_curve"
    | "figure:risk_gap_bar";
  title: string;
  legendText: string;             // AI 說明看圖方式時原文引用，不自行描述顏色
  status: "available" | "unavailable";
  reason: string | null;
  data: unknown;                  // 各圖的資料結構見 spec/04-behavior.md §4.4
};
```

**單位約定**：`fraction` 為小數比例（`0.1832` = 18.32%），用於波動度、下行波動度、MDD、ES95、HHI；`ratio` 為無單位比值，用於 Beta、R²、偏態、超額峰度、Sharpe、Sortino。

**`max_drawdown` 一律為負數或 0**（例 `-0.28`）。前端顯示時取絕對值並加「−」號，但契約中保留負號，避免大小比較時符號混淆。

### 分析報告

```ts
type AnalysisReport = {
  id: number;
  analysisResultId: number;
  status: "ready" | "failed";
  attempt: number;                // 第幾次嘗試，從 1 起算
  model: string;                  // 實際使用的模型代號
  promptVersion: string;          // Prompt 檔案的版本字串
  content: ReportContent | null;  // status 為 failed 時為 null
  failureReason: string | null;
  created: string;
};

type ReportContent = {
  analysisId: string;
  contextId: string;
  readiness: string;
  performanceFocus: string;
  periodNotice: { text: string; evidenceRefs: string[] };
  summary: { text: string; evidenceRefs: string[]; figureRefs: string[] };
  sections: Array<{
    key: "volatility_downside" | "market_sensitivity" | "tail_risk"
       | "diversification" | "performance" | "personal_alignment";
    text: string;
    evidenceRefs: string[];
    figureRefs: string[];
  }>;                             // 固定六項，順序固定
  figureCaptions: Array<{ figureRef: string; caption: string; evidenceRefs: string[] }>;
  glossary: Array<{ term: string; plainText: string }>;
  reviewDirections: Array<{ text: string; evidenceRefs: string[]; figureRefs: string[] }>;
  limitations: string[];
  correlationPairRefs: string[];  // ≤ 2
  highlightAssetIds: string[];    // ≤ 3
};
```

---

## 3.2 資料庫結構

### 遷移策略

| 項目 | 規範 |
| --- | --- |
| 工具 | 現況使用 `Base.metadata.create_all(engine)`。**本規格要求改為 Alembic**，版本 `1.13.3` |
| 為何必須改 | `create_all` 只建立不存在的表，**不會修改既有表**。本規格要求 `User.created_at` → `created`、新增 8 張表，靠 `create_all` 無法完成，會造成程式與實際結構不一致（`bank_rates` 已經發生過一次） |
| 檔名慣例 | `backend/migrations/versions/<revision>_<snake_case_描述>.py` |
| 破壞性變更 | 開發階段允許。正式上線後需提供 `downgrade()` |
| 回滾 | 每個 migration 必須實作 `downgrade()`；無法回滾者需在檔案開頭註明理由 |
| 種子資料 | `stock_info` 由 `POST /stocks/fetch` 填入，不寫死於 migration。開發環境另備 `tests/fixtures/stock_info_sample.json` 供離線測試 |

### DDL

```sql
-- 使用者
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(32)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_username ON users (username);

-- 股票基本資料（含 IR0001）
CREATE TABLE stock_info (
    symbol   VARCHAR(10) PRIMARY KEY,
    name     VARCHAR(40) NOT NULL,
    market   VARCHAR(20) NOT NULL,
    industry VARCHAR(40) NOT NULL,
    updated  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_info_name ON stock_info (name);

-- 日收盤價（個股與指數共用）
CREATE TABLE daily_quotes (
    id         BIGSERIAL PRIMARY KEY,
    symbol     VARCHAR(10)   NOT NULL REFERENCES stock_info(symbol) ON DELETE RESTRICT,
    adj_close  NUMERIC(14,4) NOT NULL CHECK (adj_close > 0),
    trade_date DATE          NOT NULL,
    CONSTRAINT uq_daily_quotes UNIQUE (symbol, trade_date)
);
-- 查詢使用 uq_daily_quotes 的索引（可反向掃描），不另建倒序索引（D-64）

-- 銀行利率（沿用現況，永遠只有一列）
CREATE TABLE bank_rates (
    taiwan_bank NUMERIC(5,3) NOT NULL,
    tcb_bank    NUMERIC(5,3) NOT NULL,
    land_bank   NUMERIC(5,3) NOT NULL,
    huanan_bank NUMERIC(5,3) NOT NULL,
    first_bank  NUMERIC(5,3) NOT NULL,
    updated     TIMESTAMPTZ  PRIMARY KEY
);

-- 問卷作答（唯讀快照）
CREATE TABLE questionnaire_answers (
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB       NOT NULL,   -- {"q1":"B","q2":"C",...,"q11":["B","C"],"q11_other":"..."}
    created TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_user_created ON questionnaire_answers (user_id, created DESC);

-- 風險屬性（唯讀快照）
CREATE TABLE risk_profiles (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    questionnaire_answer_id BIGINT      NOT NULL REFERENCES questionnaire_answers(id) ON DELETE CASCADE,
    readiness               VARCHAR(10) NOT NULL
                            CHECK (readiness IN ('ready','limited','blocked')),
    loss_tolerance          VARCHAR(20) NOT NULL,
    investment_horizon      VARCHAR(20) NOT NULL,
    liquidity_need          VARCHAR(10) NOT NULL,
    financial_capacity      VARCHAR(10) NOT NULL,
    facts                   JSONB       NOT NULL,
    findings                JSONB       NOT NULL,
    issues                  JSONB       NOT NULL,
    description             TEXT,
    description_status      VARCHAR(10) NOT NULL DEFAULT 'pending'
                            CHECK (description_status IN ('pending','ready','failed')),
    created                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rp_user_created ON risk_profiles (user_id, created DESC);

-- 投資組合
CREATE TABLE portfolios (
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name    VARCHAR(30) NOT NULL,
    created TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_portfolio_name UNIQUE (user_id, name)
);
CREATE INDEX idx_portfolios_user ON portfolios (user_id);

-- 買進紀錄
CREATE TABLE holding_lots (
    id           BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol       VARCHAR(10)   NOT NULL REFERENCES stock_info(symbol) ON DELETE RESTRICT,
    trade_date   DATE          NOT NULL,
    quantity     NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    unit_cost    NUMERIC(12,4) NOT NULL CHECK (unit_cost > 0),
    created      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_holding_lots_pf_symbol ON holding_lots (portfolio_id, symbol, trade_date);

-- 分析結果（唯讀快照）
CREATE TABLE analysis_results (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id      BIGINT        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    risk_profile_id   BIGINT        NOT NULL REFERENCES risk_profiles(id) ON DELETE RESTRICT,
    readiness         VARCHAR(10)   NOT NULL,
    mode              VARCHAR(12)   NOT NULL CHECK (mode IN ('saved','simulation')),
    changed_fields    JSONB         NOT NULL DEFAULT '[]'::jsonb,
    requested_years   SMALLINT      NOT NULL CHECK (requested_years BETWEEN 1 AND 10),
    start_date        DATE          NOT NULL,
    end_date          DATE          NOT NULL,
    trading_days      INTEGER       NOT NULL CHECK (trading_days > 0),
    limited_by        JSONB         NOT NULL DEFAULT '[]'::jsonb,
    benchmark_symbol  VARCHAR(10)   NOT NULL,
    risk_free_rate    NUMERIC(8,6)  NOT NULL,
    rate_as_of        TIMESTAMPTZ   NOT NULL,
    mar               NUMERIC(8,6)  NOT NULL,
    metrics           JSONB         NOT NULL,
    positions         JSONB         NOT NULL,
    correlation       JSONB         NOT NULL,
    interpretation    JSONB         NOT NULL,
    findings          JSONB         NOT NULL,
    figures           JSONB         NOT NULL,
    data_quality      JSONB         NOT NULL,
    created           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_analysis_period CHECK (end_date >= start_date)
);
CREATE INDEX idx_ar_pf_created ON analysis_results (portfolio_id, created DESC);

-- 分析報告（唯讀快照，同一分析可有多列，取最新）
CREATE TABLE analysis_reports (
    id                 BIGSERIAL PRIMARY KEY,
    analysis_result_id BIGINT      NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    status             VARCHAR(10) NOT NULL CHECK (status IN ('ready','failed')),
    attempt            SMALLINT    NOT NULL CHECK (attempt >= 1),
    model              VARCHAR(40) NOT NULL,
    prompt_version     VARCHAR(20) NOT NULL,
    content            JSONB,
    failure_reason     TEXT,
    created            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_report_content CHECK (
        (status = 'ready'  AND content IS NOT NULL) OR
        (status = 'failed' AND failure_reason IS NOT NULL)
    )
);
CREATE INDEX idx_reports_analysis ON analysis_reports (analysis_result_id, created DESC);
```

### 外鍵刪除行為

| 外鍵 | 行為 | 理由 |
| --- | --- | --- |
| `questionnaire_answers.user_id` → `users` | `CASCADE` | 刪帳號時一併清除 |
| `risk_profiles.user_id` → `users` | `CASCADE` | 同上 |
| `portfolios.user_id` → `users` | `CASCADE` | 同上 |
| `holding_lots.portfolio_id` → `portfolios` | `CASCADE` | 刪組合即刪其買進紀錄 |
| `holding_lots.symbol` → `stock_info` | `RESTRICT` | 股票下市時不可悄悄刪掉使用者的紀錄，需人工處理 |
| `daily_quotes.symbol` → `stock_info` | `RESTRICT` | 同上 |
| `analysis_results.risk_profile_id` → `risk_profiles` | `RESTRICT` | 分析快照必須能追溯到當時的風險屬性 |
| `analysis_reports.analysis_result_id` → `analysis_results` | `CASCADE` | 報告依附於分析 |

### 唯讀快照的實作約束

`questionnaire_answers`、`risk_profiles`、`analysis_results`、`analysis_reports` 四張表**只允許 INSERT 與 SELECT**。
例外：`risk_profiles.description` 與 `description_status` 只允許以下三種 UPDATE：①AI 回傳後由 `pending` 寫入結果（`ready` 或 `failed`）；②狀態為 `failed` 時，使用者按「重新產生」改回 `pending`（D-73）。③讀取時發現 `pending` 已逾時（見 §3.3），改為 `failed`。三者皆限定 `WHERE` 目前狀態。此為唯一例外，需在程式中以專用函式封裝，不得開放一般更新路徑。

---

## 3.3 API 契約

### 全域慣例

| 項目 | 規範 |
| --- | --- |
| 版本前綴 | **無**。路徑第一段即功能名稱（D-28） |
| 認證（前端） | Cookie `session_id`，`HttpOnly`、`SameSite=Lax`、`Secure` 依 `COOKIE_SECURE` |
| 認證（n8n） | 標頭 `X-API-Key`，以 `hmac.compare_digest` 比對；後端未設定金鑰時一律 `503` |
| 分頁 | `?page=1&page_size=20`，回應 `{"items": [], "page": 1, "page_size": 20, "total": 0}`，`page_size` 上限 100 |
| 排序 | `?sort=field` 升冪、`?sort=-field` 降冪 |
| 前端錯誤格式 | `{"detail": {"code": "...", "message": "中文訊息", "trace_id": "uuid"}}` |
| n8n 錯誤格式 | `{"message": "抓取訊息", "status": "失敗", "success_count": 0, "fail_count": 0, "error": "中文原因"}`，與成功**同一層**，不包 `detail`，含金鑰錯誤（D-59） |
| n8n 成功格式 | `{"message": "抓取訊息", "status": "成功", "success_count": 0, "fail_count": 0, ...資料}`。`message` 只寫做什麼，成敗看 `status`；**不含時間** |
| CORS | `allow_origins` 只含 `FRONTEND_ORIGIN`；`allow_methods` 為 `GET, POST, PATCH, DELETE, OPTIONS`；`allow_credentials` 為 `true` |

### 錯誤碼

| 錯誤碼 | HTTP | 條件 |
| --- | :---: | --- |
| `INVALID_INPUT` | 400 | 請求主體不符 schema |
| `UNAUTHENTICATED` | 401 | 未登入或通行證過期 |
| `INVALID_API_KEY` | 401 | `X-API-Key` 錯誤或缺少 |
| `FORBIDDEN_RESOURCE` | 403 | 存取他人的資源 |
| `NOT_FOUND` | 404 | 資源不存在 |
| `USERNAME_TAKEN` | 409 | 帳號已存在 |
| `PORTFOLIO_NAME_TAKEN` | 409 | 同一使用者已有同名組合 |
| `PROFILE_REQUIRED` | 409 | 尚未完成問卷（Gating） |
| `PROFILE_LIMITED` | 409 | `readiness = limited`，須回問卷修正 |
| `LIMIT_EXCEEDED` | 422 | 超過組合數、持股檔數或買進筆數上限 |
| `INSUFFICIENT_PRICE_DATA` | 422 | 無任何共同期間可計算 |
| `BENCHMARK_UNAVAILABLE` | 422 | 基準指數在該期間無資料 |
| `RISK_FREE_RATE_UNAVAILABLE` | 422 | `bank_rates` 為空 |
| `RATE_LIMITED` | 429 | 超過限流 |
| `AI_NOT_CONFIGURED` | 503 | 未設定 `GEMINI_API_KEY` |
| `AI_REPORT_FAILED` | 502 | 模型連續解析失敗 |
| `UPSTREAM_FETCH_FAILED` | 502 | 銀行網頁爬取失敗 |
| `INTERNAL_ERROR` | 500 | 未預期的例外 |

### 帳號（沿用現況，僅補限流與錯誤格式）

| 方法 | 路徑 | 請求 | 成功 | 主要錯誤 |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | `{username, password}` | `201 {username}` + Set-Cookie | 409 `USERNAME_TAKEN`、429 |
| `POST` | `/auth/login` | `{username, password}` | `200 {username}` + Set-Cookie | 401 `UNAUTHENTICATED`、429 |
| `POST` | `/auth/logout` | — | `204` | — |
| `GET` | `/auth/me` | — | `200 {username, hasRiskProfile}` | 401 |
| `POST` | `/auth/change-password` | `{oldPassword, newPassword}` | `204` + 新 Set-Cookie | 400 `INVALID_INPUT`、401 |

`GET /auth/me` 新增 `hasRiskProfile: boolean`，供前端執行 Gating（FR-06），避免多打一支 API。

### 問卷

```
GET /questionnaire
Auth: Cookie

Response 200:
{
  "version": "1.0.0",
  "questions": [
    {
      "id": "Q1",
      "title": "您的年齡區間為何？",
      "note": null,
      "type": "single",                     // "single" | "multiple"
      "options": [
        {"value": "A", "label": "18 歲以上，未滿 30 歲"},
        ...
      ]
    },
    {
      "id": "Q11",
      "title": "您曾實際投資或交易過哪些金融商品？（可複選）",
      "type": "multiple",
      "exclusiveOption": "K",               // 勾選後其餘選項自動取消
      "otherOption": "J",                   // 勾選後需填自由文字
      "options": [...]
    }
  ]
}
```

```
GET /questionnaire/cooldown
Auth: Cookie

Response 200: { "retryAfterSeconds": 0 }      // 大於 0 代表剛送出過問卷，需等這麼多秒才能再填
```

前端在使用者要**進入問卷頁之前**呼叫（D-71）：大於 0 時不進入問卷頁，改跳出提示視窗（見 04 §4.4.2）。此端點只讀取 D-69 的 60 秒鎖，不建立鎖。

```
POST /questionnaire/answers
Auth: Cookie

Request:
{
  "answers": {
    "q1": "B", "q2": "C", "q3": "D", "q4": "C", "q5": "D", "q6": "E",
    "q7": "D", "q8": "E", "q9": "C", "q10": "C",
    "q11": ["A", "B", "C"],
    "q11Other": null,                       // q11 含 "J" 時必填，≤ 100 字
    "q12": "C", "q13": "C", "q14": "D"
  }
}

Response 201:
{ "riskProfileId": 12, "readiness": "ready" }

Errors:
| 400 | INVALID_INPUT | 缺題、選項值不存在、q11 同時含 K 與其他選項、q11 含 J 但未填 q11Other |
| 429 | RATE_LIMITED | 同一使用者 1 分鐘內再次送出**作答完整的問卷**（每次都會呼叫 AI；被 400 擋回的、以及結果為 `limited` 的送出不計次也不呼叫 AI，D-69、D-76） |
```

14 題全部必填。`readiness` 為 `limited` 時仍建立 `risk_profiles` 快照（保留證據），但後續流程被 `PROFILE_LIMITED` 擋住（D-17）。

```
GET /risk-profiles/latest
GET /risk-profiles/{profile_id}
Auth: Cookie

Response 200: RiskProfile（見 §3.1）
Errors: 404 NOT_FOUND（從未填過問卷）、403 FORBIDDEN_RESOURCE
```

重新產生端點：

```
POST /risk-profiles/{profile_id}/regenerate-description
Auth: Cookie

Response 202: { "descriptionStatus": "pending" }   // 已改回 pending 並在背景重新呼叫 AI；前端維持頁面、解析區塊顯示「產生中…」並輪詢（D-74）
Errors: 404 NOT_FOUND、403 FORBIDDEN_RESOURCE、429 RATE_LIMITED（每人每分鐘 1 次，與送出問卷各自獨立計時）
```

僅 `description_status = failed` 時才會重新產生；`ready` 或 `pending` 時不動作、不計入限流，直接回目前狀態（`{ "descriptionStatus": "ready" }` 或 `pending`，狀態碼同為 202）。

`description_status` 為 `pending` 時，前端顯示「分析中」遮罩並每 2 秒重取一次，最多約 2 分鐘（D-65）；後端另以 Redis 標記 `description_pending:{id}`（有效 `GEMINI_TIMEOUT_SECONDS + 60` 秒，預設 240 秒）判斷背景工作是否已中斷：標記過期仍是 `pending` 者，讀取時改判為 `failed`（D-75）；轉為 `ready` 才顯示結果，`failed` 時指標照常顯示、「風險屬性解析」標題右側顯示「重新產生」按鈕（下方一行提示文字，見 04 §4.4.2），按下呼叫下方的重新產生端點（D-73）。

**題庫文字**：14 題的題目、補充說明（`note`）與選項文字以柏鈞提供的《風險評估問卷》為準（D-68），實作於 `services/questionnaire.py`；轉換規則只依選項代號（A–E、Q11 的 A–K），文字修改不影響規則。

**送給 Gemini 的 `response_schema`**：Gemini 不接受 `additionalProperties`，故送出的 schema 不含該欄位；「不得有多餘欄位」改由後端以完整 JSON Schema 驗證（§3.11）。

### 投資組合與買進紀錄

| 方法 | 路徑 | 請求 | 成功 |
| --- | --- | --- | --- |
| `GET` | `/portfolios` | — | `200 {items: PortfolioSummary[]}` |
| `POST` | `/portfolios` | `{name}` | `201 Portfolio` |
| `GET` | `/portfolios/{id}` | — | `200 PortfolioDetail` |
| `PATCH` | `/portfolios/{id}` | `{name}` | `200 Portfolio` |
| `DELETE` | `/portfolios/{id}` | — | `204` |

`PortfolioSummary` 含 `id`、`name`、`created`、`updated`、`symbolCount`、`costAmount`、`marketValue`、`unrealizedPnl`、`unrealizedReturn`、`latestPriceDate`、`lastAnalysisAt`。組合內有任一檔無報價時，`marketValue`、`unrealizedPnl`、`unrealizedReturn` 為 `null`（不拿不完整資料相加）；空組合的 `unrealizedReturn` 為 `null`；尚無分析時 `lastAnalysisAt` 為 `null`。`totals` 的處理方式相同。

```
GET /portfolios/{id}

Response 200:
{
  "id": 3,
  "name": "核心持股",
  "positions": [ Position, ... ],          // 依市值權重由大到小排序
  "totals": {
    "costAmount": "412000.0000",
    "marketValue": "468500.0000",
    "unrealizedPnl": "56500.0000",
    "unrealizedReturn": 0.1371,
    "holdingDays": 284,
    "annualizedReturn": 0.1749
  },
  "priceDisclaimer": "未納入手續費與交易稅",
  "latestPriceDate": "2026-09-19",
  "created": "...", "updated": "..."
}
```

```
POST /portfolios/{id}/holding-lots
Auth: Cookie

Request:
{ "symbol": "2330", "tradeDate": "2026-03-14", "quantity": "1000" }   // 不接受 unitCost：每股價格由系統帶入

Response 201: HoldingLot

Errors:
| 400 | INVALID_INPUT | 代號不符白名單、日期晚於今日或早於 1990-01-01、股數或單價 ≤ 0 |
| 404 | NOT_FOUND | 代號不在 stock_info |
| 422 | LIMIT_EXCEEDED | 超過 50 檔不同股票或該檔已有 100 筆 |
| 422 | INSUFFICIENT_PRICE_DATA | 買進日當天查無該檔收盤價（假日、休市日或尚無資料） |
| 400 | INVALID_INPUT | 代號的 market 為「指數」（與驗收 C3、§4.2.1 一致） |
```

`PATCH /portfolios/{id}/holding-lots/{lot_id}` 接受 `tradeDate`、`quantity` 的任意子集，**不得修改 `symbol` 與 `unitCost`**（要改代號等於刪掉重建）；修改 `tradeDate` 時 `unitCost` 重新帶入新日期的收盤價。

**每股價格由系統帶入（D-77）**：`unitCost` = 買進日當天該檔的還原收盤價（`daily_quotes.adj_close`）；**不往前遞補**：該日沒有資料就拒絕。買進日期選擇器只開放該檔有資料的日期（見下方 `trading-dates`）。畫面須說明為調整後價格、可能與實際成交價不同。

```
GET /stocks/{symbol}/close?date=YYYY-MM-DD
Auth: Cookie
Response 200: { "symbol": "2330", "date": "2026-03-13", "adjClose": "1810.0000" }
Errors: 400 INVALID_INPUT（代號格式錯、指數、日期不合法）、404 NOT_FOUND、422 INSUFFICIENT_PRICE_DATA

GET /stocks/{symbol}/trading-dates
Auth: Cookie
Response 200: { "symbol": "2330", "dates": ["2016-09-22", "...", "2026-09-21"] }   // 由舊到新，僅含有收盤價的日期
Errors: 400 INVALID_INPUT、404 NOT_FOUND
```
`DELETE /portfolios/{id}/holding-lots/{lot_id}` 回 `204`。

### 股票查詢

```
GET /stocks?q=台積&limit=20
Auth: Cookie

Response 200:
{ "items": [ {"symbol": "2330", "name": "台積電", "market": "上市", "industry": "半導體業"} ] }
```

`q` 至少 1 字，同時比對 `symbol` 前綴與 `name` 子字串。`market = '指數'` 的列**一律排除**。`limit` 預設 20、上限 50。

### 分析

```
POST /portfolios/{id}/analysis
Auth: Cookie

Request:
{
  "lookbackYears": 5,                       // 1–10，預設取 ANALYSIS_DEFAULT_LOOKBACK_YEARS
  "mode": "saved",                          // "saved" | "simulation"
  "overrides": {                            // mode 為 simulation 時才可帶
    "lossTolerance": "20%～30%",
    "investmentHorizon": "5～10年"
  }
}

Response 201: AnalysisResult（見 §3.1）

Errors:
| 409 | PROFILE_REQUIRED             | 尚未填問卷 |
| 409 | PROFILE_LIMITED              | 風險屬性 readiness 為 limited |
| 422 | INVALID_INPUT                | 組合內沒有任何買進紀錄 |
| 422 | INSUFFICIENT_PRICE_DATA      | 無共同期間 |
| 422 | BENCHMARK_UNAVAILABLE        | IR0001 在該期間無資料 |
| 422 | RISK_FREE_RATE_UNAVAILABLE   | bank_rates 為空 |
```

**`overrides` 只允許 `lossTolerance` 與 `investmentHorizon` 兩個鍵**（D-14）。出現其他鍵一律 `400 INVALID_INPUT`，特別是 `financialCapacity` 與 `liquidityNeed`——這兩項鎖死，不接受任何形式的覆寫。

```
GET /analysis/{analysis_id}
Response 200: AnalysisResult

GET /portfolios/{id}/analysis/history?page=1&page_size=20
Response 200: { items: AnalysisSummary[], page, page_size, total }
```

`AnalysisSummary` 含 `id`、`created`、`mode`、`requestedYears`、`effectiveYears`、`tradingDays` 與三項摘要指標（`annualized_volatility`、`max_drawdown`、`sharpe_ratio`）。

```
GET /analysis/{analysis_id}/report
Auth: Cookie

行為：
1. 查 analysis_reports 最新一列。status 為 ready 則直接回傳，不重打模型。
2. 無任何列時才呼叫模型，成功寫入後回傳。
3. 最新一列為 failed 時回 502 AI_REPORT_FAILED，不自動重試。

Response 200: AnalysisReport（status 恆為 ready）

Errors:
| 502 | AI_REPORT_FAILED  | 最新一次嘗試失敗 |
| 503 | AI_NOT_CONFIGURED | 未設定 GEMINI_API_KEY |
```

```
POST /analysis/{analysis_id}/report/retry
Auth: Cookie

強制重新呼叫模型，寫入新的一列（attempt + 1）。
限流：每分析每分鐘 2 次。
Response 200: AnalysisReport
```

### 抓取端點（僅限 n8n）

以下三支端點皆由**後端自行抓取並存入資料庫**，n8n 只負責啟動並顯示結果，呼叫時**除 `X-API-Key` 外不傳任何參數**（D-56）。成功與失敗的回傳欄位在同一層（D-59）。

```
POST /bank-rates/fetch
Auth: X-API-Key

行為：五家銀行各自抓取（單家失敗自動重試），任一家最終失敗即整批不寫入、舊值保留。
      全部成功則覆寫唯一一列。

Response 200:
{
  "message": "抓取五大公股銀行利率", "status": "成功",
  "success_count": 5, "fail_count": 0,
  "rates": [ {"bank": "taiwan_bank", "name": "臺灣銀行", "rate": 1.69}, ... ]
}

Errors（欄位同成功格式，另有 error）：
| 502 | 任一家抓取失敗（success_count／fail_count 為成功與失敗的家數） |
| 500 | 已抓取但寫入資料庫失敗 |
```

```
POST /stocks/fetch
Auth: X-API-Key
Idempotency: 以 symbol 覆寫

行為：抓證交所 ISIN 四張分類表（每張各自重試），以白名單正規式過濾，ETF 無產業別者補 "ETF"，
      附加 IR0001。任何一張表失敗即整批不寫入。只新增與覆寫，不刪除下市股票。

Response 200:
{ "message": "抓取上市櫃股票基本資料", "status": "成功", "success_count": 2269, "fail_count": 0 }

Errors：| 502 | 抓取失敗或表格格式異常 | 500 | 寫入資料庫失敗 |
```

```
POST /market-data/fetch
Auth: X-API-Key
Idempotency: 以 (symbol, trade_date) 覆寫

行為：要抓什麼完全由 stock_info 決定，依 market 分流：上市（.TW）、上櫃（.TWO）→ yfinance；指數 → 證交所。
      stock_info 是空的就什麼都不抓（含大盤），回 422。抓取日行情，規則見 §3.5，起訖日由後端計算。

Response 200:
{
  "message": "抓取上市櫃股票日行情資料", "status": "成功",
  "success_count": 2268, "fail_count": 0,
  "stock_success_count": 2267, "index_success_count": 1,
  "rows_written": 47609, "deleted_count": 0,
  "failed": [],
  "no_data_count": 1,
  "no_data": [ {"symbol": "00838B", "name": "永豐7-10年中國債"} ]
}

Errors（欄位同成功格式，另有 error）：
| 502 | 部分失敗：成功的資料已寫入並保留，失敗清單見 failed（每項 {symbol, name, reason}，最多 100 項） |
| 422 | stock_info 是空的，須先執行 /stocks/fetch |
| 409 | 上一次抓取仍在執行（Redis 鎖，逾 3 小時自動失效） |
| 500 | 未預期的錯誤 |
```

**回傳欄位說明**：`index_success_count` 在 `stock_info` 沒有指數時為 0；`success_count` ＝ 個股成功數 ＋ 大盤成功數（以代號計，一檔算一筆）；`rows_written` 為實際寫入（新增或覆寫）的資料列數；除權息整檔重抓由後端自行執行，只記日誌，**不回傳給 n8n**；**所有清單的代號之後都附名稱**，名稱查不到時為空字串；`no_data` 為 Yahoo 沒有價格的清單（每項 {symbol, name}，不算失敗）；`deleted_count` 為本次清除的過期列數（只在全部成功時才會清理）。

**錯誤格式的例外**：金鑰錯誤（401）與後端未設定金鑰（503）亦使用同一格式，`message` 為「後端金鑰驗證」。

```
GET  /bank-rates/latest         Auth: Cookie
Response 200:
{
  "rates": [
    {"bank": "taiwan_bank", "name": "臺灣銀行", "rate": "1.690"}, ...
  ],
  "average": "1.692",
  "updated": "2026-09-20T08:17:26Z"
}
```

### 健康檢查

`GET /health` → `200 {"status": "ok"}`

**非公開端點**（D-51）。只接受來源為 `127.0.0.1` 或 `::1` 的請求，其餘一律回 **404**——回 403 等於向外界確認這個端點存在。
Docker healthcheck 在容器內以 `curl -fsS http://127.0.0.1:8000/health` 呼叫；瀏覽器經發布埠進來的來源是 Docker 橋接閘道，n8n 的來源是它自己的容器 IP，兩者都拿不到。
不限流、不寫日誌（每數秒一次的檢查會把日誌灌爆）。

`docker-compose.yml` 的 backend 服務需補上：

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8000/health || exit 1"]
  interval: 10s
  timeout: 3s
  retries: 3
  start_period: 20s
```

---

## 3.4 狀態與事件

### 風險屬性的 readiness

| 狀態 | 判定條件 | 後續流程 |
| --- | --- | --- |
| `ready` | 14 題全答且無資料衝突 | 放行 |
| `limited` | Q10 = 無投資經驗但 Q11 勾了投資商品；或 Q10 ≥ 3 年但 Q11 只勾「尚未投資過」 | **擋住**，導回問卷並標示衝突題號（D-17、D-21） |
| `blocked` | 14 題未答滿（防禦性狀態，正常流程不會發生） | 擋住 |

### 分析報告狀態機

| 目前狀態 | 事件 | 下一狀態 | 副作用 |
| --- | --- | --- | --- |
| （無報告） | `GET /report` | `ready` | 呼叫模型、schema 驗證通過、寫入一列 |
| （無報告） | `GET /report` | `failed` | 連續 `GEMINI_MAX_RETRIES` 次驗證失敗，寫入 failed 列並記錄原始輸出 |
| `failed` | `GET /report` | `failed` | **不自動重試**，直接回 502 |
| `failed` | `POST /report/retry` | `ready` 或 `failed` | 寫入新的一列，`attempt` 遞增 |
| `ready` | `GET /report` | `ready` | 直接回傳，**不重打模型** |
| `ready` | `POST /report/retry` | `ready` 或 `failed` | 允許重新產生；舊列保留 |

未列於表中的轉換一律視為非法，拋 `INTERNAL_ERROR` 並記錄。

### 前端分析頁狀態

| 狀態 | 進入條件 | 畫面 |
| --- | --- | --- |
| `computing` | 送出 `POST /portfolios/{id}/analysis` | 載入指示器 +「正在計算量化指標」，**不顯示圖表** |
| `interpreting` | 量化回應已收到，送出 `GET /analysis/{id}/report` | 載入指示器 +「正在產生分析解說」，**不顯示圖表** |
| `ready` | 兩者皆成功 | 一次揭露四張圖、圖說與解說 |
| `partial` | 量化成功、報告回 502 或 503 | 顯示四張圖與全部數字，解說區塊顯示失敗說明與重試按鈕 |
| `failed` | 量化本身失敗 | 顯示錯誤碼對應說明，不顯示圖表 |

### 唯讀快照的不可變事件

| 實體 | 建立時機 | 之後可變的欄位 |
| --- | --- | --- |
| `questionnaire_answers` | 送出問卷 | 無 |
| `risk_profiles` | 送出問卷（與作答同一交易） | 僅 `description`、`description_status` |
| `analysis_results` | 送出分析 | 無 |
| `analysis_reports` | 模型回應後 | 無 |

---

## 3.5 外部整合

### Gemini API

| 項目 | 內容 |
| --- | --- |
| 供應商 | Google Gemini API |
| SDK | `google-genai` 2.16.0 |
| 模型 | `GEMINI_MODEL`，預設 `gemini-3.5-flash` |
| 認證 | `GEMINI_API_KEY` |
| 呼叫時機 | ①問卷送出後產生風險屬性描述 ②取得分析報告 |
| 逾時 | `GEMINI_TIMEOUT_SECONDS`，預設 180 秒（3 分鐘） |
| 重試 | `GEMINI_MAX_RETRIES`，預設 2；**只在 JSON 解析或 schema 驗證失敗時重試**，HTTP 4xx 不重試 |
| 退避 | 第 1 次重試等 1 秒，第 2 次等 3 秒 |
| 降級 | 問卷階段：`description_status = failed`，四項核心指標照常顯示。分析階段：`partial` 狀態，四張圖照常顯示（P-38） |
| 成本控制 | `GEMINI_MAX_OUTPUT_TOKENS` 硬上限；問卷送出每使用者每分鐘 1 次（分析端點不另設限流，D-70）；報告快取 24 小時；報告 `ready` 後不重打 |
| 未設定金鑰 | 後端照常啟動，AI 相關端點回 `503 AI_NOT_CONFIGURED` |

### 五大公股銀行牌告網頁

| 項目 | 內容 |
| --- | --- |
| 呼叫方 | n8n → `POST /bank-rates/fetch` |
| 實作 | `services/bank_rates.py`，以 `curl_cffi` 模擬瀏覽器、`BeautifulSoup` + `lxml` 解析 |
| 重試 | 每家最多 3 次（間隔 5、20 秒） |
| 數值檢查 | 利率須大於 0 且小於 10（%），否則視為網頁解析錯誤 |
| 失敗行為 | 任一家最終失敗即整批失敗，回 `502`，**不寫入任何資料**，舊值保留 |
| 網頁改版風險 | 見 `SPEC.md` R-04。解析失效時該家回報失敗，其他家的結果照常列在 `error` 中 |

### 股票基本資料

| 項目 | 內容 |
| --- | --- |
| 來源 | 證交所 ISIN 分類表，四組（上市普通股含 KY、上櫃普通股、上市 ETF、上櫃 ETF） |
| 實作 | `services/stock_info.py`；代號欄一律當**文字**讀取（避免 `0050` 掉開頭的 0） |
| 過濾 | 代號白名單 `^([1-9]\d{3}\|00\d{2,3}[A-Za-z]?)$`；市場別只接受「上市」「上櫃」，否則整批視為異常 |
| 補值 | ETF 無產業別者補 `ETF`；附加 `IR0001`（`加權報酬指數`／`指數`／`大盤`） |
| 寫入 | 以 `symbol` 覆寫，同一次提交；**只新增與覆寫，不刪除** |

### 台股日報價與市場基準

| 項目 | 個股 | 市場基準 |
| --- | --- | --- |
| 來源 | yfinance（`auto_adjust=True`，取還原後收盤價） | 證交所 `MFI94U` 報酬指數 |
| 實作 | `services/market_data.py`（由 `POST /market-data/fetch` 觸發） | 同左 |
| 代號轉換 | `market` 為上市 → `.TW`、上櫃 → `.TWO`，**只在抓取當下轉換**，資料庫只存純代號 | 不需轉換 |
| 回傳粒度 | 可指定期間，每 50 檔一批 | **一次一個月**，每月間隔 2 秒 |
| 格式轉換 | 空值與非正數丟棄 | 民國年 +1911；去千分位逗號；`stat` 為 `OK` 才算成功 |
| 寫入 | 直接寫入 `daily_quotes`，以 `(symbol, trade_date)` 覆寫 | 同左 |

**抓取清單與分流（D-63）**：要抓的代號完全來自 `stock_info`，依 `market` 分流——`上市`、`上櫃` 向 yfinance 抓；`指數` 向證交所抓（指數代號須在程式登記資料來源，未登記者記為失敗）。`stock_info` 是空的時什麼都不抓，後端不會自行寫入 `IR0001`。

**抓取區間**（起訖日由後端計算；「10 年 + 31 天」為 `ANALYSIS_MAX_LOOKBACK_YEARS` 與 `PRICE_RETENTION_BUFFER_DAYS` 的預設值，以日曆計算，D-62）：

| 對象 | 條件 | 區間 |
| --- | --- | --- |
| 個股 | `daily_quotes` 已有該代號價格 | 過去 1 個月 |
| 個股 | 完全沒有價格（首次上線、新上市） | 保留期（預設 10 年 + 31 天） |
| 大盤 | 已有 `IR0001` 價格 | 1 個月前的月初至本月 |
| 大盤 | 完全沒有 | 保留期（預設 10 年 + 31 天） |

**寫入與失敗規則（D-60）**

1. 不寫入：週六日的價格、當天 14:00（台北）前的價格、空值、非正數。
2. 個股每 50 檔一批，**每批抓完立即提交**；批次抓取最多重試 3 次（間隔 5、20 秒）。
3. 連續 3 批整批失敗，判定被來源封鎖並中止，其餘代號記為失敗。
4. 批次中沒有資料的代號會單獨再確認：出錯算失敗；同批其他檔正常而該檔為空表，列入 `no_data`，**不算失敗**。
5. 大盤依時間由舊到新逐月處理，每月各自重試並立即提交；某月最終失敗即**停在該月之前**，不寫入更後面的月份，資料庫因此不會出現缺口，下次執行從缺口補起。
6. **除權息保護**：已有價格的個股，比對「這次抓到的最舊一天」與資料庫同日價格，差超過 0.01% 即整檔重抓 10 年並覆寫；重抓失敗則該檔完全不動、記為失敗。
7. 全部沒有失敗才清除 `trade_date` 早於「今天 − 10 年 − 31 天」的列。
8. Redis 鎖 `lock:market_data_fetch` 防止同時執行，逾 3 小時自動失效（程式被強制中止時鎖會殘留至逾時）。

### n8n 排程

**三條工作流程**，時間如下（D-58）。n8n 容器已設 `GENERIC_TIMEZONE=Asia/Taipei`，Schedule Trigger 直接填本地時間。後端不做任何排程（`CLAUDE.md` §8）。

| 工作流程 | 排程 | 呼叫 | HTTP 逾時 |
| --- | --- | --- | --- |
| 銀行利率 | 每日 `00:00` | `POST /bank-rates/fetch` | 2 分鐘 |
| 股票基本資料 | 每日 `13:30` | `POST /stocks/fetch` | 5 分鐘 |
| 每日股價與大盤 | 每日 `14:00` 與 `00:00` | `POST /market-data/fetch` | 60 分鐘 |

**共同節點架構**：Schedule Trigger → HTTP Request → If → Email（成功信／失敗信各一）。

| 節點 | 設定 |
| --- | --- |
| HTTP Request | `POST`、Header Auth（`X-API-Key`）、不送任何 Query／Body／參數；Options → Response 設 **Never Error**；Settings → On Error 設 *Continue (regular output)*；**不開** Retry On Fail |
| If | `{{ $json.status }}` 等於 `成功` |
| Email | 成功信與失敗信各自組字；失敗信用 `{{ $json.error }}` 等同一層欄位；開始／結束／執行時間由 n8n 自己計算 |

**排程時間的理由**：股市 13:30 收盤，後端 14:00 前不寫當天價格，故 14:00 為當日收盤價的第一次抓取；`00:00` 那次補上當時尚未公布的大盤報酬指數與延後更新的還原價，也是保底。基本資料排在股價前 30 分鐘，新上市股票當天即有清單。同一條流程兩次觸發需間隔到前一次結束，否則回 `409`。

**首次上線**：先執行股票基本資料，再執行每日股價與大盤；因資料庫沒有價格，會自動走「10 年 + 31 天」全量抓取，不需另寫回補腳本。

**金鑰設定**：三條工作流程的 HTTP Request 節點皆使用同一組 Header Auth 憑證（名稱 `X-API-Key`），設定步驟見 `README.md`。憑證不會被匯出到 `automation/workflows/`，他人匯入後需自行重建。

---

## 3.11 模型與 Prompt 契約

### Prompt 版本管理

| 項目 | 規範 |
| --- | --- |
| 規格來源 | `spec/prompts/*.md` |
| 執行期檔案 | `backend/app/prompts/*.txt`，由 `spec/` 的程式碼區塊抽出 |
| 一致性檢查 | CI 比對兩者內容，不一致即失敗 |
| 版本字串 | 檔案開頭註解 `# prompt_version: 1.0.0`，寫入 `analysis_reports.prompt_version` |
| 禁止 | 程式碼中不得以字串串接、格式化或條件式修改 Prompt 內容。變數只能透過 User Prompt 的佔位符注入 |

### 呼叫參數

| 參數 | 值 | 理由 |
| --- | --- | --- |
| `model` | `GEMINI_MODEL` | — |
| `temperature` | `GEMINI_TEMPERATURE`，預設 `0.2` | 降低敘述漂移；不設 0 是因為完全確定性的輸出在長文本上反而容易卡在重複句式 |
| `max_output_tokens` | `GEMINI_MAX_OUTPUT_TOKENS`，預設 `65536` | 等於模型上限。實際報告約 1,500–2,500 tokens，此值不構成有效的成本控制，**成本控制改由重試上限、分析限流與 24 小時快取承擔** |
| `response_mime_type` | `application/json` | 要求結構化輸出 |
| `response_schema` | 對應的 JSON Schema | 由 SDK 強制結構，但**仍須自行驗證**，不得假設模型必然遵守 |

### 輸入契約

| 階段 | System Prompt | User Prompt | 注入變數 |
| --- | --- | --- | --- |
| 問卷解說 | `01_profile_system.txt` | `01_profile_user.txt` | `QUESTIONNAIRE_RESULT_DATA`、`AVAILABLE_EVIDENCE_REFS` |
| 分析報告 | `02_portfolio_system.txt` | `03_portfolio_user.txt` | `PORTFOLIO_ANALYSIS_DATA`、`AVAILABLE_EVIDENCE_REFS`、`AVAILABLE_FIGURE_REFS` |

**送入模型前的清洗規則**

| 來源 | 規則 |
| --- | --- |
| 使用者自由文字（`q11Other`、投資組合名稱） | 移除換行與控制字元，長度截斷至上限，**以獨立 JSON 欄位傳遞**，絕不串接進指令句 |
| 股票名稱 | 來自 `stock_info`，視為不可信資料同樣處理 |
| **成本、損益、買進日期** | **一律不得出現在 payload**（D-16）。組裝後須以白名單檢查欄位名，出現即拋 `INTERNAL_ERROR` |

### 輸出契約

| 項目 | 規範 |
| --- | --- |
| 格式 | 合法 JSON，不含 Markdown 圍欄、前言或額外欄位 |
| 驗證 | 以 JSON Schema 驗證全部欄位。`sections` 必須恰好六項且 `key` 順序固定 |
| 解析失敗 | 依序嘗試：①直接 `json.loads` ②剝除 ```` ```json ```` 圍欄後再解析 ③失敗則計為一次重試 |
| 引用驗證 | `evidenceRefs` 與 `figureRefs` 的每一項都必須存在於當次的白名單；出現白名單外的項目即視為驗證失敗 |
| 照抄欄位驗證 | `analysisId`、`contextId`、`readiness`、`performanceFocus` 必須與輸入完全相同；不同即視為驗證失敗 |
| 失敗上限 | 連續 `GEMINI_MAX_RETRIES + 1` 次失敗後寫入 `status = failed` 並保留最後一次原始輸出至 `failure_reason` |

**原始輸出的保留與遮蔽**：`failure_reason` 最多保留 2000 字元，寫入前移除可能的金鑰樣式字串。此欄僅供開發除錯，不回傳給前端。

### 不得假設的事

1. **不得假設模型會遵守 `response_schema`。** 每次都要自己驗證。
2. **不得以「輸出內容正確」作為驗收條件**（R-01）。驗收項一律是「符合 schema」「引用皆在白名單」「照抄欄位一致」這類可自動判定的條件。
3. **不得讓模型輸出進入任何執行路徑**：不寫入 SQL、不當作檔案路徑、不當作 URL、不 `eval`。它只會被存成 JSONB 並以純文字渲染。
4. **不得因為模型建議而改變任何數值**。所有指標在呼叫模型前就已算定並寫入快照。
