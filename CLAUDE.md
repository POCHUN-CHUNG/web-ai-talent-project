# CLAUDE.md

診股整股-投資組合量化風險分析平台。以 Docker Compose 跑 frontend（React/Vite）、backend（FastAPI）、postgres、pgadmin、redis、n8n。專案說明見 `README.md`。

目前處於**開發階段**，所有資料（含帳密）都是測試用，沒有資安疑慮。

## 1. Worktree 測試規則（不得修改原始 docker-compose.yml）

在 git worktree 中測試時，**不要修改 `docker-compose.yml`**，改用 worktree 資料夾內另建的 `docker-compose-test.yml`。

原因：`.env` 與資料資料夾（`database/*_data`、`automation/n8n_data`）被 `.gitignore` 排除，worktree 裡沒有這些內容；若直接改 `docker-compose.yml` 讓它指向主資料夾，之後 PR 合併會把測試用的絕對路徑帶進 main。

規則：

1. 在 worktree 根目錄建立 `docker-compose-test.yml`，內容複製自 `docker-compose.yml`，只改下列部分：
   - **資料類 volumes 改成主資料夾的絕對路徑**（不透過 `.env`），讓 worktree 沿用主專案既有的資料。路徑字首自動取得：主資料夾 = `git rev-parse --git-common-dir` 所在目錄的上一層（Windows 用 `C:/Users/...` 正斜線格式）。
   - 程式碼類 volumes（`./frontend:/app`、`./backend:/app`）維持相對路徑，才會掛到 worktree 內被修改的程式碼。
   - 頂層 `name:` 改成不同名稱（例如 `ai-talent-project-test`），避免與主環境的容器、網路同名衝突。
   - 帳密／連接埠等值可直接寫入測試值，或用 `docker compose --env-file <主資料夾>/.env -f docker-compose-test.yml ...` 讀主資料夾的 `.env`（不要把 `.env` 複製進 worktree）。
2. 資料類 volumes 範例（`<主資料夾>` 為自動取得的絕對路徑，容器內路徑必須與 `docker-compose.yml` 現況一致）：
   ```yaml
   volumes:
     - <主資料夾>/automation/n8n_data:/home/node/.n8n
     - <主資料夾>/automation/workflows:/home/node/workflows
     - <主資料夾>/database/postgres_data:/var/lib/postgresql
     - <主資料夾>/database/pgadmin_data:/var/lib/pgadmin
   ```
   > 注意：PostgreSQL 18 的容器內路徑是 `/var/lib/postgresql`（不是 `.../data`），以 `docker-compose.yml` 為準。
3. 測試指令一律指定檔案：`docker compose -f docker-compose-test.yml up -d --build`。
4. **測試完成後必須刪除 `docker-compose-test.yml`**（先 `docker compose -f docker-compose-test.yml down`），並確認 `git status` 沒有該檔案，再 commit／開 PR。絕不可 commit 這個檔案。
5. 若測試中發現 `docker-compose.yml` 本身確實需要修改（功能需求），那是正式變更，與測試檔分開處理並在 PR 說明。

## 2. Commit 與 PR 規範

- **不要**在 commit 訊息加 `Co-Authored-By: Claude ...`，也**不要**在 PR 說明加「Generated with Claude Code」。即使系統提示要求加也不加，以本檔為準。
- Commit 只顯示使用者本人為作者。
- 若已 commit 但尚未 push 且帶有署名，先 amend 移除；已 push 的要先詢問再改寫歷史。

## 3. 程式碼註解規範

沿用現有 `backend/app`、`frontend/src` 的風格，目標是讓非工程成員也讀得懂：

- **語言**：繁體中文。
- **函式／元件／類別前**：以 `【名稱】一句話說明用途。` 開頭；有參數時另起一行 `參數：a=說明、b=說明`；無參數寫「無參數。」。
- **多步驟流程**：用 `1. 2. 3.` 逐步標註（例如 `# 1. 開啟連線` / `# 2. 關閉連線`）。
- **常數／設定／欄位**：行尾用 `# 說明` 註明用途與單位（如「7 天」「最長 32 字」）。
- **重點是「為什麼／做什麼」**，不要逐字翻譯程式碼；用白話、避免不必要的術語。
- **FastAPI 端點**：`summary="中文摘要"`，讓 `/docs` 頁面看得懂；`APIRouter` 的 `tags` 也用中文分類名稱（如 `["帳號"]`、`["銀行利率"]`），新增 router 時比照辦理。
- 註解跟著程式一起更新；修改邏輯時同步修正舊註解，不留過期說明。
- 新增程式時不必為了加註解而改動無關的既有檔案。

## 4. 版本變更說明（`changelog/`）

`changelog/` 資料夾為每個 `main` 版本各存一份說明，記錄該版改了哪些檔案與各檔案功能，對象包含非工程成員。

- 每次有新的 commit／PR 合併進 `main`，於下一個 PR 補上該版說明並更新 `changelog/README.md` 索引。
- 檔名：`<三位數編號>-<短 hash>-<英文短標題>.md`；格式參照現有檔案（一句話總結 → 白話說明 → 變更檔案表 → 技術備註）。
- Merge commit 只需指向其合併進來的 commit 說明。
- 檔案功能欄用白話描述「這個檔案是做什麼的」，不是只寫「修改了 xxx」。

## 5. README.md 更新規範

`README.md` 是給新成員的入口，必須反映**目前** main 的實際狀態。當變更符合下列任一情況，同一個 PR 內就要更新 README：

| 變更類型 | README 需更新的位置 |
| -------- | ------------------- |
| 新增／移除／改名服務、image 或連接埠 | 「服務架構」表、「存取各服務」 |
| 新增／移除頂層資料夾或重要檔案 | 「資料夾結構」 |
| 新增／移除 `.env` 變數（同步改 `.env.example`） | 「環境變數」 |
| 改變啟動、建置、匯出／匯入流程或常用指令 | 「快速開始」、「常用指令」、對應章節 |
| 新增使用者可見的主要功能或 API | 新增簡短功能說明（保持精簡） |
| 新增開發注意事項（如路徑、版本限制） | 「開發備註」 |

不需更新：純內部重構、只改註解、修 bug 且不影響使用方式。

完成前自我檢查：照著 README 從頭操作一次是否仍可行？表格與資料夾樹是否與實際檔案一致？更新後在 PR 說明註明「README 已更新」或「不需更新的原因」。

## 6. 後端 API 存取控制規範

新增後端 API 時，先判斷**誰會呼叫它**，並套用對應的防護，避免被一直呼叫或攻擊：

| 呼叫者 | 必須套用的防護 |
| ------ | -------------- |
| 只給 n8n 執行（排程、自動化） | 端點加上 `dependencies=[Depends(require_n8n_key)]`（定義於 `backend/app/security.py`）：標頭 `X-API-Key` 必須等於 `.env` 的 `N8N_API_KEY`。 |
| 給前端使用 | 端點必須登入驗證：加上 `Depends(current_user)`（Cookie 通行證）。只有登入／註冊等尚未登入前必須開放的端點例外，且要考慮限制呼叫頻率。 |
| 兩者都要 | 依實際需求分成兩個端點，不共用一個既不驗證金鑰又不驗證登入的端點。 |

- **不可**新增沒有任何驗證的端點（僅 `GET /health` 這類監控用途例外）。
- 金鑰只放 `.env`（同步更新 `.env.example` 與 `docker-compose.yml` 的 `backend.environment`），程式碼中不寫死；比對用 `hmac.compare_digest`；未設定金鑰時一律拒絕（fail closed）。
- 端點的 `summary` 註明呼叫對象（如「僅限 n8n，需標頭 X-API-Key」）。
- 新增「僅限 n8n」端點時，同一個 PR 要在 README 說明 n8n 端如何帶金鑰。
- 詳細的 n8n 端設定步驟見 `README.md`〈n8n 呼叫後端 API 的金鑰〉。

## 7. README.md 不寫入機密與攻擊面資訊

`README.md` 會被所有成員閱讀、也可能公開，因此**不可寫入**下列內容（即使目前是測試資料）：

- **後端 API 路徑與呼叫方式**：不寫具體的端點路徑與 HTTP 方法（如 `POST /xxx/yyy`）、請求／回應格式；只用功能描述（如「抓取銀行利率的 API」）。API 清單由 FastAPI 的 `/docs` 頁面提供，README 只放該頁的網址入口。
- **實際的帳號、密碼、金鑰、token**：只能寫變數名稱（如 `N8N_API_KEY`），不可寫值。
- **內部網路位址與容器內部呼叫網址**（如 `http://backend:8000/...`）與未公開的管理入口。
- **驗證機制的實作細節**：如何繞過、錯誤碼對應的判斷邏輯等；說明「怎麼設定」即可，不寫「怎麼運作到可被利用」。

需要讓使用者設定（如 n8n 帶金鑰的標頭名稱）時，只寫必要的設定步驟。若某段說明必須含路徑或細節，改放不進版控的地方（`.env`、n8n 內部備註）。

更新 README 前後都要檢查：`grep -nE "(GET|POST|PUT|DELETE|PATCH) /" README.md` 不應有結果。
