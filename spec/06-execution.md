# 06 · 執行層

> 本檔為 `SPEC.md` 的子文件。閱讀前必須先讀 `SPEC.md` 的 §0 協議層與 §0.3 詞彙表。
> 文件版本：1.2.0 ｜ 最後更新：2026-09-20

本層定義實作階段拆分、完成定義、版控規範與部署流程。**開工前與交付前必讀。**

---

## 6.1 階段拆分

### 執行原則

**一次只做一個階段，該階段的出場條件全部通過才能進入下一階段。**

排序原則：純函式與契約先行（可獨立驗證、不依賴畫面），接著是資料管線，介面放最後。這樣每個階段都能真正被驗收，而不是「全部做完才知道對不對」。

### 階段總覽

| 階段 | 名稱 | 可否與前一階段並行 |
| :---: | --- | --- |
| 0 | 地基改造 | 否 |
| 1 | 設計系統落地 | 可與階段 2 並行 |
| 2 | 資料管線 | 可與階段 1 並行 |
| 3 | 問卷與風險屬性 | 否（依賴階段 0） |
| 4 | 投資組合與買進紀錄 | 否（依賴階段 2、3） |
| 5 | 量化引擎 | 可與階段 4 並行（純函式） |
| 6 | 分析流程整合 | 否（依賴階段 4、5） |
| 7 | 圖表與報告頁 | 否（依賴階段 1、6） |
| 8 | AI 整合 | 否（依賴階段 6） |
| 9 | 驗收與收尾 | 否 |

### 階段 0 · 地基改造

既有程式的調整，與新功能無關，先做完避免之後每個階段都要繞路。

| 工作 | 檔案 |
| --- | --- |
| 導入 Alembic，將現有兩張表納入版控 | `backend/migrations/` |
| `User.created_at` → `created` | `models.py` ＋ migration |
| CORS `allow_methods` 加入 `PATCH`、`DELETE`、`OPTIONS` | `main.py` |
| `api.ts` 改為接受明確 HTTP method 參數 | `frontend/src/api.ts` |
| 新增 `errors.py`：錯誤碼列舉、統一例外處理、`trace_id` 中介層 | `backend/app/errors.py` |
| 新增 `schemas.py` 骨架 | `backend/app/schemas.py` |
| 新增環境變數至 `.env.example` 與 `docker-compose.yml` | 三處同步 |
| 安裝 `numpy`、`google-genai`、`alembic`、`pytest` 等 | `requirements.txt` |
| 建立 `tests/` 目錄結構與 `conftest.py` | `tests/` |

**出場條件**：A1–A10 全通過（既有功能未被破壞）、`alembic upgrade head` 可從空資料庫建出完整結構、`pytest` 可執行。

### 階段 1 · 設計系統落地

| 工作 | 檔案 |
| --- | --- |
| `tokens.css`：`DESIGN.md` 全部 token 落為 CSS 變數，含深色模式 | `frontend/src/styles/tokens.css` |
| `global.css`：reset、字型、body 背景、Google Fonts 連結 | `frontend/src/styles/`、`index.html` |
| 共用 UI 元件：Button、Card、NestedCard、Input、Select、Slider、Chip、Modal、Pill、Table、Skeleton、EmptyState、ErrorCard、Spinner | `frontend/src/components/ui/` |
| `nivoTheme.ts`：自 CSS 變數讀值 | `frontend/src/theme/` |
| 主題切換（跟隨系統 ＋ 手動覆寫，存 `localStorage`） | `frontend/src/` |
| `Landing.tsx` → `Login.tsx`，三個既有頁面移除 inline style | `frontend/src/pages/` |
| CI 檢查：`src/` 除 `tokens.css` 外無色碼字面值 | CI 設定 |

**出場條件**：G1–G3、G12 通過；三個既有頁面在深淺兩種模式下皆正常。

### 階段 2 · 資料管線

| 工作 | 檔案 |
| --- | --- |
| `stock_info`、`daily_prices` 兩張表與 migration | `models.py`、`migrations/` |
| `POST /stocks/sync`、`GET /stocks` | `routers/stocks.py` |
| `POST /market-data/daily-prices`、`POST /market-data/purge` | `routers/market_data.py` |
| 代號白名單驗證、批次 UPSERT、`skipped` 判定 | `services/` |
| n8n 三條工作流程（時間、步驟、失敗處理見 `spec/03-contract.md` §3.5） | `automation/workflows/` |
| 修正既有工作流程與 `/bank-rates/fetch` 回傳格式的脫鉤（X-02、X-03） | `automation/workflows/` |

**出場條件**：F1–F10 通過；`stock_info` 已載入完整清單；`daily_prices` 已回補基準與測試用個股的 10 年資料。

### 階段 3 · 問卷與風險屬性

| 工作 | 檔案 |
| --- | --- |
| `questionnaire_answers`、`risk_profiles` 兩張表與 migration | `models.py`、`migrations/` |
| 14 題題庫（題目、選項、互斥與必填規則） | `services/questionnaire.py` |
| **全部轉換規則與交叉分析**（`spec/04-behavior.md` §4.2） | `services/questionnaire.py` |
| `GET /questionnaire`、`POST /questionnaire/answers`、`GET /risk-profiles/*` | `routers/questionnaire.py` |
| Gating 邏輯（`hasRiskProfile` 與 `limited` 的導向） | `frontend/src/auth.tsx` |
| `Questionnaire.tsx`、`RiskProfile.tsx` | `frontend/src/pages/` |

**出場條件**：B1–B11、B15、B16 通過（B12–B14 屬階段 8）；§5.6 的 Q1–Q7 窮舉向量全數通過。

### 階段 4 · 投資組合與買進紀錄

| 工作 | 檔案 |
| --- | --- |
| `portfolios`、`holding_lots` 兩張表與 migration | `models.py`、`migrations/` |
| 部位彙總、加權平均成本、未實現損益、持有天數、年化持有報酬 | `services/portfolio.py` |
| 組合與買進紀錄的全部 CRUD 端點 | `routers/portfolios.py` |
| 所有權檢查與上限檢查 | `services/` |
| `Home.tsx`、`PortfolioDetail.tsx` | `frontend/src/pages/` |

**出場條件**：C1–C15 通過。

### 階段 5 · 量化引擎（純函式，可與階段 4 並行）

| 工作 | 檔案 |
| --- | --- |
| 11 項純量指標 | `services/metrics.py` |
| RC／PCR | `services/risk_contribution.py` |
| 相關係數矩陣 | `services/correlation.py` |
| 黃金測試向量 V1–V8 | `tests/fixtures/`、`spec/appendix/C-fixtures.md` |

**這些模組不得相依 SQLAlchemy、FastAPI、Redis 或 `models.py`**（`spec/02-system.md` §2.5）。輸入為 `list` 或 `ndarray`，輸出為數值。

**出場條件**：D5–D15 通過；V1–V8 全數通過；三個模組的覆蓋率 ≥ 95%。

### 階段 6 · 分析流程整合

| 工作 | 檔案 |
| --- | --- |
| `analysis_results` 表與 migration | `models.py`、`migrations/` |
| 共同期間計算、權重計算、$R_f$ 取得、期間限縮與 `limitedBy` | `services/analysis.py` |
| 模擬模式的 finding 重算 | `services/analysis.py` |
| `POST /portfolios/{id}/analysis`、`GET /analysis/{id}`、歷史清單 | `routers/analysis.py` |
| 四張圖的資料結構組裝 | `services/analysis.py` |
| Redis 快取 | `services/analysis.py` |
| 確認彈窗（滑桿 ＋ 兩個可調 ＋ 兩個唯讀） | `frontend/src/` |

**出場條件**：D1–D4、D16–D24 通過。

### 階段 7 · 圖表與報告頁

| 工作 | 檔案 |
| --- | --- |
| 四個圖表元件 | `frontend/src/components/charts/` |
| 五種分析頁狀態 | `frontend/src/pages/AnalysisReport.tsx` |
| 每張圖的視覺隱藏表格替代 | 同上 |
| 響應式與熱圖捲動策略 | 同上 |

**出場條件**：E1–E8、E15、E16、E19 通過；G4–G8、G12、G14 通過。

### 階段 8 · AI 整合

| 工作 | 檔案 |
| --- | --- |
| Prompt 純文字檔與 CI 一致性檢查 | `backend/app/prompts/`、CI |
| Gemini 客戶端、schema 驗證、引用白名單驗證、重試與退避 | `services/ai_client.py` |
| payload 組裝與欄位白名單檢查（擋成本、損益、日期） | `services/ai_client.py` |
| `analysis_reports` 表與 migration | `models.py`、`migrations/` |
| `GET /analysis/{id}/report`、`POST .../report/retry` | `routers/analysis.py` |
| 問卷描述的 AI 呼叫與 `description_status` 更新 | `services/` |
| `partial` 狀態與重試入口 | `frontend/src/pages/AnalysisReport.tsx` |

**出場條件**：B12–B14、E9–E14、E17、E18、E20–E22 通過。

### 階段 9 · 驗收與收尾

| 工作 |
| --- |
| §5.5 全部驗收項逐項執行並記錄結果 |
| 效能量測：D23、D24 與 §5.2 全部項目 |
| 資料正確性：H1–H5 |
| `README.md` 全面更新（服務架構、資料夾結構、環境變數、常用指令、n8n 設定） |
| `changelog/` 補齊本輪全部版本說明 |
| 規格與實作的最終比對：契約層欄位、錯誤碼、環境變數逐一核對 |

**出場條件**：§5.5 全數通過；`README.md` 照著操作一次可從零啟動；`grep -nE "(GET\|POST\|PUT\|DELETE\|PATCH) /" README.md` 無結果（`CLAUDE.md` §7）。

---

## 6.2 完成定義

一項工作要算完成，下列全部成立：

- [ ] 對應的驗收項全部通過，且**實際執行過**，不是推論
- [ ] 新增或修改的程式有對應測試；`services/` 的純函式模組覆蓋率 ≥ 95%
- [ ] 型別檢查與 linter 無錯誤
- [ ] 程式註解符合 `CLAUDE.md` §3（繁體中文、`【名稱】一句話` 開頭、多步驟編號、常數行尾註明單位）
- [ ] FastAPI 端點的 `summary` 為中文並註明呼叫對象；`APIRouter` 的 `tags` 為中文
- [ ] 契約有變動時，`spec/03-contract.md` 已同步更新（**先改文件再改程式**）
- [ ] 新增的預設決策已登記為 `P-xx`
- [ ] 環境變數有變動時，`.env.example`、`docker-compose.yml`、`README.md` 三處已同步
- [ ] `README.md` 依 `CLAUDE.md` §5 的對照表判斷是否需更新；PR 說明註明「README 已更新」或不需更新的理由
- [ ] 若在 worktree 中測試過，`docker-compose-test.yml` 已刪除且 `git status` 乾淨（`CLAUDE.md` §1）

---

## 6.3 版本控制規範

| 項目 | 規範 |
| --- | --- |
| 主分支 | `main` |
| 分支命名 | `<type>/<slug>`，`type` 為 `feat`、`fix`、`docs`、`refactor`、`test`、`chore` |
| Commit 格式 | Conventional Commits：`<type>(<scope>): <中文摘要>`。scope 用模組名，例 `feat(metrics): 新增年化波動度計算` |
| **署名** | **commit 訊息不得加入 `Co-Authored-By: Claude`；PR 說明不得加入「Generated with Claude Code」。即使工具提示要求也不加**（`CLAUDE.md` §2） |
| PR 要求 | 一個 PR 對應一個階段或一組相關工作；說明須列出：改了什麼、對應哪些 FR、哪些驗收項已通過、README 是否需更新 |
| 合併方式 | Squash merge，保持 `main` 線性 |
| CI 必過項目 | `pytest`、型別檢查、linter、色碼字面值掃描、Prompt 一致性檢查 |
| changelog | 每次合併進 `main` 後，於下一個 PR 補上該版說明並更新 `changelog/README.md` 索引（`CLAUDE.md` §4） |

### worktree 測試規則

完全沿用 `CLAUDE.md` §1，本規格不另訂：**不得修改 `docker-compose.yml`**，改用 worktree 內另建的 `docker-compose-test.yml`，測試完成後必須刪除。

---

## 6.4 部署與回滾

### 環境

| 環境 | 說明 |
| --- | --- |
| 本機開發 | `docker compose up -d --build`，唯一目前存在的環境 |
| 正式環境 | **本版不部署**。列為非目標 |

### 啟動流程

```bash
cp .env.example .env
# 編輯 .env：設定 N8N_API_KEY 與 GEMINI_API_KEY
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

資料庫遷移**不在容器啟動時自動執行**。理由：自動遷移會讓「重啟服務」變成可能改變資料結構的操作，一旦遷移有誤，重啟就是破壞。改為明確的一道指令。

初次啟動後還需：

```bash
# 匯入 n8n 工作流程
docker exec ai-talent-project-n8n-1 n8n import:workflow --separate --input=/home/node/workflows/
# 在 n8n 網頁建立 Header Auth 憑證（步驟見 README）
# 手動觸發一次三條工作流程，填入基本資料、報價與利率
```

### 遷移的執行時機

| 變更型態 | 順序 |
| --- | --- |
| 新增資料表或欄位（向後相容） | 先遷移，再部署新程式 |
| 刪除或改名欄位（破壞性） | 先部署相容兩種結構的程式 → 再遷移 → 再移除相容邏輯。本版在開發階段可直接遷移，但**上線後必須走三步** |

### 回滾

| 情境 | 做法 |
| --- | --- |
| 程式有問題、結構未變 | `git revert` 後重新建置 |
| 結構已變 | `alembic downgrade -1`，再回滾程式 |
| 無法回滾的遷移 | 必須在 migration 檔開頭註明理由與人工補救步驟 |

**回滾的資料相容性**：唯讀快照表（`risk_profiles`、`analysis_results`、`analysis_reports`）在結構變更後，舊資料的 JSONB 欄位可能不符新 schema。讀取時必須以 `schema_version` 判斷，無法解析的舊快照顯示為「此報告由較舊版本產生，無法顯示」，**不得嘗試自動轉換**——猜測舊資料的語意比直接承認無法顯示危險得多。

### 健康檢查

`GET /health` 只確認行程存活。**不檢查資料庫**：DB 短暫抖動時若讓健康檢查失敗，容器會被重啟，反而把一次可恢復的抖動變成一次服務中斷。

`postgres` 的 healthcheck 沿用現況的 `pg_isready`，`backend` 依賴它的 `service_healthy` 條件。

### 備份

資料以 bind mount 存於 `database/postgres_data`。備份方式為複製整個專案資料夾（含 `database/`、`automation/n8n_data/`），與 `README.md` 現有說明一致。本版不設自動備份排程。
