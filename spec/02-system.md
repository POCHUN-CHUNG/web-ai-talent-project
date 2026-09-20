# 02 · 系統層

> 本檔為 `SPEC.md` 的子文件。閱讀前必須先讀 `SPEC.md` 的 §0 協議層與 §0.3 詞彙表。
> 文件版本：1.2.0 ｜ 最後更新：2026-09-20

本層定義技術棧版本、執行環境、系統架構與資料流、檔案結構、模組相依規則與環境變數。任何實作開始前必須先讀完本檔。

---

## 2.1 技術棧與版本鎖定

### 容器映像

| 用途 | 映像 | 版本 | 鎖定理由 |
| --- | --- | --- | --- |
| 前端執行環境 | `node` | `24.21-trixie` | 沿用現況；Node 24 為 LTS |
| 後端執行環境 | `python` | `3.13-trixie` | 沿用現況；SQLAlchemy 2.0 與 NumPy 2.5 皆完整支援 |
| 資料庫 | `postgres` | `18-trixie` | 沿用現況。**資料掛載路徑為 `/var/lib/postgresql`，非舊版的 `.../data`** |
| 資料庫管理介面 | `dpage/pgadmin4` | `latest` | 開發用工具，不影響產出正確性，沿用現況 |
| 快取與 Session | `redis` | `8-trixie` | 沿用現況 |
| 自動化 | `n8nio/n8n` | `latest` | 沿用現況。工作流程本身已由 `automation/workflows/` 進版控，升級後可重新匯入 |

**應用服務映像（frontend、backend、postgres、redis）一律使用固定標籤，不得改為 `latest`**：它們的版本直接影響計算結果與資料相容性。
**工具類容器（pgadmin、n8n）允許 `latest`**：不參與計算、不持有唯一資料來源，升級的便利性大於版本漂移的風險。
變更任一映像版本屬正式變更，需同步更新 `README.md` 的服務架構表。

### 後端套件

| 套件 | 版本 | 用途 | 狀態 |
| --- | --- | --- | --- |
| `fastapi` | `0.115.0` | Web 框架 | 現有 |
| `uvicorn[standard]` | `0.30.6` | ASGI 伺服器 | 現有 |
| `sqlalchemy` | `2.0.35` | ORM | 現有 |
| `psycopg2-binary` | `2.9.10` | PostgreSQL 驅動 | 現有 |
| `redis` | `5.0.8` | Redis 客戶端 | 現有 |
| `python-dotenv` | `1.0.1` | 環境變數載入 | 現有 |
| `beautifulsoup4` | `4.12.3` | 銀行利率爬取 | 現有 |
| `lxml` | `5.3.0` | HTML 解析 | 現有 |
| `curl_cffi` | `0.7.4` | 模擬瀏覽器請求 | 現有 |
| `argon2-cffi` | `23.1.0` | 密碼雜湊 | 現有 |
| `numpy` | `2.5.3` | 量化指標運算 | **新增** |
| `google-genai` | `2.16.0` | Gemini API 客戶端 | **新增** |
| `alembic` | `1.13.3` | 資料庫遷移 | **新增** |
| `jsonschema` | `4.23.0` | 驗證 Gemini 回傳的 JSON | **新增** |
| `pytest` | `8.3.3` | 測試框架 | **新增（僅測試）** |
| `pytest-cov` | `5.0.0` | 覆蓋率 | **新增（僅測試）** |
| `httpx` | `0.27.2` | FastAPI TestClient | **新增（僅測試）** |

**執行期只新增四個套件，另三個僅供測試。** 偏態、峰度、迴歸、分位數皆以 `spec/04-behavior.md` §4.1 的明確公式用 NumPy 實作，**不引入 `pandas`、`scipy`、`statsmodels`**：三者體積遠大於實際需求，且 `scipy.stats.skew` 預設為母體偏態（分母 $n$），與本系統指定的樣本偏態（$G_1$，分母 $(n-1)(n-2)$）不同，混用會直接產生錯誤數值。

**為什麼必須引入 Alembic**：現況的 `Base.metadata.create_all(engine)` 只建立不存在的資料表，**不會修改既有表**。本規格要求新增 8 張表並將 `User.created_at` 改名為 `created`，靠 `create_all` 無法完成，會讓程式定義與實際結構不一致——`bank_rates` 已經發生過一次同類問題。

測試套件置於 `requirements.txt` 的 `# 測試` 區段，與執行期套件以註解分隔但同一檔案管理（本專案規模不需拆出 `requirements-dev.txt`）。

限流以 Redis 自行實作（見 `spec/05-quality.md` §5.1），**不引入 `slowapi`**。

### 前端套件

| 套件 | 版本 | 用途 | 狀態 |
| --- | --- | --- | --- |
| `react` / `react-dom` | `18.3.1` | UI 框架 | 現有 |
| `react-router-dom` | `6.26.2` | 路由 | 現有 |
| `vite` | `5.4.1` | 建置工具 | 現有 |
| `@vitejs/plugin-react` | `4.3.1` | React 支援 | 現有 |
| `typescript` | `5.6.3` | 型別檢查 | **新增**（現況未安裝，但已使用 `.tsx`） |
| `@nivo/core` | `0.99.0` | 圖表核心 | **新增** |
| `@nivo/heatmap` | `0.99.0` | 相關係數熱圖 | **新增** |
| `@nivo/bar` | `0.99.0` | 權重對照、風險落差對照條 | **新增** |
| `@nivo/line` | `0.99.0` | 淨值走勢與回撤面積 | **新增** |

Nivo 0.99.0 的 React peer range 為 `^16.14 || ^17.0 || ^18.0 || ^19.0`，與現有 React 18.3.1 相容，不需升級 React。

**不引入 Tailwind、UI 元件庫、CSS-in-JS 套件**（P-26）。樣式一律 CSS 自訂屬性 + CSS Modules。

### 相依套件政策

| 項目 | 規範 |
| --- | --- |
| 新增套件 | 需在 PR 說明中列出：套件名、版本、用途、為何無法用現有方案達成 |
| 授權限制 | 禁止 GPL / AGPL。新增套件需確認為 MIT / BSD / Apache-2.0 |
| 前端體積預算 | 正式版 JS 總量 ≤ 500 KB（gzip）。Nivo 四個套件約佔 160 KB |

### Lockfile 與可重現建置

| 項目 | 規範 |
| --- | --- |
| 前端 lockfile | `frontend/package-lock.json`，**必須進版控** |
| 後端 lockfile | 現況以 `requirements.txt` 固定版本即可，**每一行都必須是 `==` 精確版本**，禁止 `>=`、`~=`、無版本 |
| 安裝指令 | 前端 CI 與映像建置一律 `npm ci`；後端一律 `pip install -r requirements.txt` |
| 禁止 | CI 中不得執行任何會更新 lockfile 的指令；應用服務映像不得使用 `latest` 標籤 |

---

## 2.2 執行環境與相容性

| 項目 | 規格 |
| --- | --- |
| 開發作業系統 | 不限（Docker Desktop 需支援 Compose v2）。現況開發機為 Windows |
| 容器執行環境 | Debian trixie（各映像內建） |
| 最低瀏覽器版本 | Chrome 111、Edge 111、Safari 16.4、Firefox 128 |
| 螢幕寬度範圍 | 320 px – 2560 px |
| 網路假設 | 必須連網。離線行為不在範圍內，斷線時的畫面表現見 `spec/04-behavior.md` §4.3 |
| 時區 | 後端與資料庫一律 UTC 儲存；前端顯示一律轉 `Asia/Taipei`；n8n 容器已設 `GENERIC_TIMEZONE=Asia/Taipei` |

瀏覽器版本下限由下列特性決定，不得再降低：CSS `color-mix()`（玻璃卡效果，Chrome 111 / Safari 16.2）、`backdrop-filter` 無前綴（Safari 16.4）、CSS 巢狀選擇器（Chrome 112 / Safari 16.5，本專案不使用，故不納入下限）。

### 對外連接埠

沿用現況，全部為預設值 +1：

| 服務 | 對外埠 | 容器內埠 |
| --- | --- | --- |
| frontend | `5174` | `5173` |
| backend | `8001` | `8000` |
| postgres | `5433` | `5432` |
| pgadmin | `5051` | `80` |
| redis | `6380` | `6379` |
| n8n | `5679` | `5678` |

---

## 2.3 架構與資料流

### 元件關係

```
                  ┌──────────────┐
                  │   瀏覽器      │
                  └──────┬───────┘
                         │ HTTPS/HTTP + Cookie(session_id)
                         ▼
                  ┌──────────────┐
                  │   frontend    │  React 18 + Vite
                  │   :5174       │  只呼叫 backend，不直接碰 DB
                  └──────┬───────┘
                         │ fetch(credentials: "include")
                         ▼
   ┌─────────────────────────────────────────────┐
   │              backend :8001                   │
   │  routers → services → repositories           │
   │  ┌────────────┬──────────────┬────────────┐ │
   │  │ auth       │ questionnaire│ analytics  │ │
   │  │ portfolios │ market_data  │ bank_rates │ │
   │  └────────────┴──────────────┴────────────┘ │
   └───┬──────────┬──────────────┬───────────┬───┘
       │          │              │           │
       ▼          ▼              ▼           ▼
 ┌─────────┐ ┌────────┐  ┌────────────┐ ┌──────────┐
 │postgres │ │ redis  │  │ Gemini API │ │銀行牌告網頁│
 │  :5433  │ │ :6380  │  │  (外部)     │ │  (外部)   │
 └─────────┘ └────────┘  └────────────┘ └──────────┘
       ▲
       │ X-API-Key
 ┌─────┴──────┐
 │    n8n      │  排程觸發，不直接連 DB
 │   :5679     │  台股與 IR0001 的抓取程式（柏鈞自行撰寫）
 └─────────────┘
```

### 信任邊界

| 邊界 | 不可信輸入 |
| --- | --- |
| 瀏覽器 → backend | 所有請求主體、查詢參數、Cookie 值 |
| n8n → backend | `X-API-Key` 標頭、批次寫入的每一列資料 |
| 外部網頁 → backend | 銀行牌告頁面的 HTML 內容 |
| Gemini API → backend | 模型回傳的全部內容（含 JSON 結構本身） |
| 資料庫 → Prompt | 問卷自由文字（Q11 選項 J）、投資組合名稱 |

**模型回傳的內容一律視為不可信資料**，必須通過 JSON schema 驗證才可寫入資料庫或回傳前端。

### 同步與非同步邊界

本版**全部同步**。沒有訊息佇列、沒有背景工作者、後端不做排程。

| 操作 | 型態 | 預期耗時 |
| --- | --- | --- |
| 帳號、問卷、投資組合 CRUD | 同步 | < 200 ms |
| 量化分析 | 同步 | < 3 s（10 檔、5 年） |
| AI 報告產生 | 同步，但**與量化分析分成兩支端點** | < 60 s（逾時上限 180 s） |
| 銀行利率抓取 | 同步，由 n8n 觸發 | < 20 s |
| 報價批次寫入 | 同步，由 n8n 觸發 | < 5 s／5000 列 |

**量化分析與 AI 報告必須分成兩支端點**，理由是**故障隔離**，不是為了提早顯示圖表。

前端在兩支請求都完成前**不顯示任何圖表**，改以分階段的載入狀態說明目前進度（2026-09-20 修訂）：

| 前端狀態 | 觸發時機 | 畫面 |
| --- | --- | --- |
| `computing` | 送出 `POST /portfolios/{id}/analysis` 之後 | 載入指示器 + 「正在計算量化指標」 |
| `interpreting` | 量化結果已回，送出 `GET /analysis/{id}/report` 之後 | 載入指示器 + 「正在產生分析解說」 |
| `ready` | 兩者皆成功 | 一次揭露四張圖與完整解說 |
| `partial` | 量化成功、AI 失敗或逾時 | 顯示四張圖與全部數字，解說區塊顯示失敗說明與重試按鈕 |
| `failed` | 量化本身失敗 | 顯示錯誤碼對應的說明，不顯示圖表 |

`partial` 是 AI 失敗時的降級狀態（FR-36），不是正常流程中的過渡狀態。正常流程只會經過 `computing → interpreting → ready`。
載入指示器的視覺規格見 `spec/04-behavior.md` §4.4，配色與動效依 `DESIGN.md`。

### 一次分析的完整路徑

```
使用者點「評估管理」
  → GET /risk-profiles/latest            取得 saved 風險屬性
  → 前端顯示確認彈窗（滑桿 + 兩項可調欄位）
  → POST /portfolios/{id}/analysis       body: lookback_years, mode, overrides
  → 前端進入 computing 狀態（不顯示圖表）
       ├─ 讀 holding_lots → 彙總部位與目前市值權重
       ├─ 讀 daily_prices（持股代號）→ 求最長共同期間（D-09）
       ├─ 讀 daily_prices（symbol = MARKET_BENCHMARK_SYMBOL）→ 對齊同一期間
       ├─ 讀 bank_rates 最新一批 → 算術平均得 risk_free_rate
       ├─ 計算 11 項純量 + RC/PCR + 相關矩陣
       ├─ 以 effective profile 重算 2 條 finding
       └─ 寫入 analysis_results（唯讀快照）
  → 回傳 analysis_id + 量化結果 + 四張圖的資料
  → 前端切換為 interpreting 狀態（仍不顯示圖表）
  → GET /analysis/{id}/report            AI 解說
       ├─ 組裝 PORTFOLIO_ANALYSIS_DATA（不含成本、損益與買進日期欄位）
       ├─ 呼叫 Gemini
       ├─ JSON schema 驗證，失敗則重試（上限 2 次）
       └─ 寫入 analysis_reports
  → 前端進入 ready，一次揭露四張圖、圖說與解說
     （AI 失敗則進入 partial：圖表照常顯示，解說區塊顯示重試按鈕）
```

### 三條不可違反的架構規則

1. **所有金融數值由後端算定。** AI 只解釋，不計算。任何在前端或 Prompt 中出現的算術，都是違規。
2. **分析結果是唯讀快照。** `analysis_results` 與 `analysis_reports` 一旦寫入不得修改。重新分析產生新列。
3. **後端不做排程。** 不使用 cron、APScheduler、Celery beat。所有定時行為由 n8n 觸發（`CLAUDE.md` §8）。

---

## 2.4 檔案結構

```
web-ai-talent-project/
├── docker-compose.yml
├── .env                          # 不進版控
├── .env.example
├── CLAUDE.md                     # 開發規範
├── DESIGN.md                     # 設計系統（設計的唯一依據）
├── SPEC.md                       # 規格索引
├── README.md
├── spec/                         # 規格子文件（見 SPEC.md 導航表）
├── changelog/                    # main 每個版本的變更說明
├── .github/
│   └── workflows/
│       └── ci.yml                # CI：pytest、型別檢查、linter、色碼掃描、Prompt 一致性
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini               # 【新增】Alembic 設定
│   ├── migrations/               # 【新增】資料庫遷移
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py               # 應用程式進入點、CORS、掛載 router
│       ├── db.py                 # PostgreSQL 與 Redis 連線
│       ├── models.py             # SQLAlchemy 資料表定義
│       ├── schemas.py            # 【新增】Pydantic 請求／回應模型
│       ├── security.py           # 密碼、Session、n8n 金鑰、限流
│       ├── errors.py             # 【新增】錯誤碼與統一例外處理
│       ├── prompts/              # 【新增】執行期 Prompt 純文字檔
│       │   ├── 01_profile_system.txt
│       │   ├── 01_profile_user.txt
│       │   ├── 02_portfolio_system.txt
│       │   └── 03_portfolio_user.txt
│       ├── routers/              # HTTP 層：只做參數驗證與呼叫 service
│       │   ├── auth.py
│       │   ├── questionnaire.py  # 【新增】
│       │   ├── portfolios.py     # 【新增】含買進紀錄的增改刪
│       │   ├── analysis.py       # 【新增】
│       │   ├── market_data.py    # 【新增】
│       │   ├── stocks.py         # 【新增】股票查詢與基本資料同步
│       │   └── bank_rates.py
│       └── services/             # 業務邏輯層
│           ├── bank_rates.py     # 銀行牌告爬取
│           ├── questionnaire.py  # 【新增】14 題 → 指標與 finding 的轉換規則
│           ├── portfolio.py      # 【新增】買進紀錄彙總、權重、損益
│           ├── metrics.py        # 【新增】11 項純量指標
│           ├── risk_contribution.py  # 【新增】RC / PCR
│           ├── correlation.py    # 【新增】相關係數矩陣
│           ├── analysis.py       # 【新增】分析流程編排與快照寫入
│           └── ai_client.py      # 【新增】Gemini 呼叫、schema 驗證、重試
├── frontend/
│   ├── Dockerfile
│   ├── index.html                # Google Fonts 連結置於此
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json             # 【新增】
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # 路由表
│       ├── api.ts                # 統一請求函式（需支援完整 REST）
│       ├── auth.tsx              # 登入狀態與守衛
│       ├── styles/               # 【新增】
│       │   ├── tokens.css        # DESIGN.md 全部 token 的 CSS 變數
│       │   └── global.css        # reset、字型、body 背景
│       ├── theme/                # 【新增】
│       │   └── nivoTheme.ts      # 從 CSS 變數讀值，供四張圖共用
│       ├── components/           # 【新增】共用元件
│       │   ├── charts/
│       │   │   ├── CorrelationHeatmap.tsx
│       │   │   ├── WeightVsPcrBar.tsx
│       │   │   ├── DrawdownCurve.tsx
│       │   │   └── RiskGapBar.tsx
│       │   └── ui/               # Button、Card、Input、Chip、Modal、Slider…
│       └── pages/
│           ├── Login.tsx         # 登入／註冊（原 Landing.tsx，更名）
│           ├── Home.tsx          # 投資組合清單
│           ├── Questionnaire.tsx # 【新增】14 題問卷
│           ├── RiskProfile.tsx   # 【新增】四項核心指標與 AI 描述
│           ├── PortfolioDetail.tsx  # 【新增】持股部位、買進紀錄、損益
│           ├── AnalysisReport.tsx   # 【新增】四張圖與 AI 解說
│           └── Settings.tsx
├── tests/                        # 【新增】
│   ├── conftest.py               # 共用 fixture 與測試資料庫設定
│   ├── unit/                     # 演算法與轉換規則
│   ├── integration/              # API 端點
│   └── fixtures/
│       ├── reference_impl.py     # 黃金向量的獨立參考實作
│       ├── generate_vectors.py   # 向量產生腳本
│       ├── golden_vectors.json   # 量化指標黃金向量
│       └── questionnaire_vectors/  # 問卷規則窮舉向量（CSV，每組一檔）
├── automation/
│   ├── n8n_data/                 # 不進版控
│   └── workflows/                # n8n 工作流程匯出檔，進版控
├── database/                     # 不進版控
│   ├── postgres_data/
│   └── pgadmin_data/
├── cache/
└── references/
```

`tests/` 置於專案根目錄而非 `backend/` 內，是為了讓未來的前端測試也能落在同一棵樹下。測試執行方式見 `spec/05-quality.md` §5.4。

---

## 2.5 模組邊界與相依規則

### 後端分層

| 模組 | 可以相依 | **不可**相依 | 理由 |
| --- | --- | --- | --- |
| `services/metrics.py`、`risk_contribution.py`、`correlation.py` | `numpy` 與標準函式庫 | SQLAlchemy、FastAPI、Redis、`models.py`、任何 I/O | 純函式，輸入 list/ndarray 輸出數值。這是能以黃金向量驗證的前提 |
| `services/questionnaire.py` | 標準函式庫 | 任何 I/O、AI 客戶端 | 轉換規則是純函式，必須可單獨測試全部 27 種與 25 種組合 |
| `services/portfolio.py` | 標準函式庫、`decimal` | FastAPI、AI 客戶端 | 買進紀錄彙總與損益是純計算 |
| `services/analysis.py` | 上述所有 service、`models.py`、`db.py` | FastAPI 的 `Request` / `Response` | 流程編排層，不碰 HTTP |
| `services/ai_client.py` | `google-genai`、`schemas.py` | `models.py`、`db.py` | AI 層不直接寫資料庫，由 `analysis.py` 決定寫入 |
| `routers/*` | `services/*`、`schemas.py`、`security.py` | `numpy`、直接的 SQL | HTTP 層只做驗證與轉接 |
| `models.py` | SQLAlchemy | 任何 service | 資料表定義不含業務邏輯 |

**單向相依**：`routers → services → models`。反向相依一律禁止。

### 前端分層

| 模組 | 可以相依 | **不可**相依 | 理由 |
| --- | --- | --- | --- |
| `components/ui/*` | `styles/tokens.css` | `api.ts`、頁面元件 | 純展示元件，不知道資料從哪來 |
| `components/charts/*` | `theme/nivoTheme.ts`、`@nivo/*` | `api.ts` | 圖表只接收 props，不自己取資料 |
| `pages/*` | `api.ts`、`auth.tsx`、`components/*` | 直接呼叫 `fetch` | 所有請求走 `api.ts`，才能統一處理錯誤與 Cookie |
| `theme/nivoTheme.ts` | `styles/tokens.css` 的變數名稱 | 硬編碼色碼 | 顏色只有一個來源 |

### 顏色與尺寸的單一來源

任何顏色、圓角、字級、間距的字面值**只能出現在 `styles/tokens.css`**。其他檔案一律引用 `var(--token-name)`。
CI 檢查：`src/` 底下除 `tokens.css` 外，不得出現 `#[0-9a-fA-F]{3,8}`、`rgb(`、`hsl(` 的字面色值。

---

## 2.6 設定與環境變數

### 現有變數（維持不變）

| 變數 | 型別 | 預設 | 環境 | 說明 | 機密 |
| --- | --- | --- | --- | --- | :---: |
| `POSTGRES_USER` | string | `ai_talent_user` | all | 資料庫帳號 | 是 |
| `POSTGRES_PASSWORD` | string | — | all | 資料庫密碼 | 是 |
| `POSTGRES_DB` | string | `ai_talent_db` | all | 資料庫名稱 | 否 |
| `POSTGRES_PORT` | int | `5433` | all | 對外埠 | 否 |
| `PGADMIN_DEFAULT_EMAIL` | string | — | dev | pgAdmin 帳號 | 是 |
| `PGADMIN_DEFAULT_PASSWORD` | string | — | dev | pgAdmin 密碼 | 是 |
| `PGADMIN_PORT` | int | `5051` | dev | 對外埠 | 否 |
| `REDIS_PASSWORD` | string | — | all | Redis 密碼 | 是 |
| `REDIS_PORT` | int | `6380` | all | 對外埠 | 否 |
| `N8N_BASIC_AUTH_USER` | string | `admin` | all | n8n 帳號 | 是 |
| `N8N_BASIC_AUTH_PASSWORD` | string | — | all | n8n 密碼 | 是 |
| `N8N_PORT` | int | `5679` | all | 對外埠 | 否 |
| `N8N_API_KEY` | string | — | all | n8n 呼叫後端專用金鑰 | 是 |
| `FRONTEND_PORT` | int | `5174` | all | 對外埠 | 否 |
| `BACKEND_PORT` | int | `8001` | all | 對外埠 | 否 |
| `COOKIE_SECURE` | bool | `false` | all | 正式環境設 `true` | 否 |

### 由 docker-compose 注入後端的變數（維持不變）

`DATABASE_URL`、`REDIS_URL`、`FRONTEND_ORIGIN`。

### 新增變數

| 變數 | 型別 | 預設 | 環境 | 說明 | 機密 |
| --- | --- | --- | --- | --- | :---: |
| `GEMINI_API_KEY` | string | — | all | Gemini API 金鑰 | **是** |
| `GEMINI_MODEL` | string | `gemini-3.5-flash` | all | 模型代號 | 否 |
| `GEMINI_TIMEOUT_SECONDS` | int | `180` | all | 單次呼叫逾時（3 分鐘） | 否 |
| `GEMINI_MAX_OUTPUT_TOKENS` | int | `65536` | all | 輸出上限。`gemini-3.5-flash` 的模型上限即為 65,536 tokens，無法再高 | 否 |
| `GEMINI_TEMPERATURE` | float | `0.2` | all | 降低敘述漂移 | 否 |
| `GEMINI_MAX_RETRIES` | int | `2` | all | JSON 解析失敗的重試次數 | 否 |
| `ANALYSIS_DEFAULT_LOOKBACK_YEARS` | int | `5` | all | 滑桿預設值 | 否 |
| `ANALYSIS_MIN_LOOKBACK_YEARS` | int | `1` | all | 滑桿下界 | 否 |
| `ANALYSIS_MAX_LOOKBACK_YEARS` | int | `10` | all | 滑桿上界 | 否 |
| `MARKET_BENCHMARK_SYMBOL` | string | `IR0001` | all | 市場基準代號 | 否 |
| `PRICE_RETENTION_BUFFER_DAYS` | int | `31` | all | 保留期在 `ANALYSIS_MAX_LOOKBACK_YEARS` 之外的緩衝天數。實際保留期 = 上限年數 + 此緩衝，不另設固定天數 | 否 |
| `ANALYSIS_CACHE_TTL_SECONDS` | int | `86400` | all | 分析結果快取秒數 | 否 |
| `RATE_LIMIT_AUTH_PER_MINUTE` | int | `10` | all | 登入／註冊每 IP 每分鐘上限 | 否 |
| `RATE_LIMIT_ANALYSIS_PER_MINUTE` | int | `3` | all | 分析每使用者每分鐘上限 | 否 |

### 設定規範

1. 新增任一變數，必須在**同一個 PR** 內同步更新三處：`.env.example`、`docker-compose.yml` 的 `backend.environment`、`README.md` 的〈環境變數〉章節（`CLAUDE.md` §5、§6）。
2. 標記為機密的變數：只放 `.env`，程式中不得寫死預設值，不得寫入任何日誌，不得出現在 `README.md`（`CLAUDE.md` §7）。
3. `GEMINI_API_KEY` 未設定時，後端啟動不失敗，但 `/analysis/{id}/report` 一律回 `503` 並附錯誤碼 `AI_NOT_CONFIGURED`。理由：讓不需要 AI 的開發者仍能跑完整量化流程。
4. 所有整數型變數在啟動時驗證範圍，超出範圍立即拋錯並終止啟動（fail fast），不使用預設值悄悄蓋過。
