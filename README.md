# 診股整股-投資組合量化風險分析平台

以 Docker Compose 建置的開發環境，包含前端、後端、資料庫、快取與自動化服務，資料庫與工作流程資料皆掛載在專案本地目錄，分享或搬到新環境時可保留原有資料。

## 服務架構

| 服務     | 說明                | Image                   | 對外連接埠            |
| -------- | ------------------- | ----------------------- | --------------------- |
| frontend | React 開發伺服器    | `node:24.21-trixie`     | http://localhost:5174 |
| backend  | FastAPI 開發伺服器  | `python:3.13-trixie`    | http://localhost:8001 |
| postgres | PostgreSQL 資料庫   | `postgres:18-trixie`    | localhost:5433        |
| pgadmin  | PostgreSQL 管理介面 | `dpage/pgadmin4:latest` | http://localhost:5051 |
| redis    | 快取服務            | `redis:8-trixie`        | localhost:6380        |
| n8n      | 自動化工作流程      | `n8nio/n8n:latest`      | http://localhost:5679 |

> 連接埠都比預設值 +1，避免跟機器上其他既有服務衝突。

## 資料夾結構

```
ai-talent-project/
├── docker-compose.yml       # 服務定義
├── .env                     # 實際帳密設定（不進版控）
├── .env.example             # 帳密設定範本
├── CLAUDE.md                # 開發規範（worktree 測試、註解、README／changelog 維護）
├── changelog/               # main 每個版本的變更說明（改了哪些檔案、各檔案功能）
├── frontend/                # React 原始碼
├── backend/                 # FastAPI 原始碼
├── references/              # 爬蟲原型腳本（實際執行的版本在 backend/app/services/）
├── database/
│   ├── postgres_data/       # PostgreSQL 資料（本地掛載）
│   └── pgadmin_data/        # pgAdmin 連線設定（本地掛載）
├── cache/                   # Redis 說明文件（服務設定在 docker-compose.yml）
└── automation/
    ├── n8n_data/            # n8n 帳號、憑證、執行紀錄（本地掛載）
    └── workflows/           # n8n 工作流程匯出檔（本地掛載）
```

`database/postgres_data`、`database/pgadmin_data`、`automation/n8n_data` 是 bind mount 目錄：容器產生的實際資料會寫入這幾個資料夾，並被 `.gitignore` 排除在版控之外。**分享或搬移專案時，直接複製整個專案資料夾（含這三個目錄），到新環境執行 `docker compose up -d` 即可還原所有資料，不需要重新建置資料庫或重新登入 n8n。**

`automation/workflows/` 則相反，是刻意**不**排除在 `.gitignore` 外的目錄，用來存放用 n8n CLI 匯出的工作流程 JSON（不含帳號密碼、不含憑證明文），讓流程可以安全地跟著 git 一起分享，詳見下方〈n8n 工作流程備份與還原〉。

## 快速開始

1. 安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（需啟用 Docker Compose v2）。
2. 複製環境變數範本並依需求調整帳密：
   ```bash
   cp .env.example .env
   ```
   接著把 `.env` 裡的 `N8N_API_KEY` 換成自己產生的金鑰，產生方式見下方〈n8n 呼叫後端 API 的金鑰〉。
3. 啟動所有服務：
   ```bash
   docker compose up -d --build
   ```
4. 確認容器狀態：
   ```bash
   docker compose ps
   ```

## 存取各服務

- **前端**：http://localhost:5174
- **後端 API 文件**：http://localhost:8001/docs
- **pgAdmin**：http://localhost:5051，登入帳密為 `.env` 的 `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`。首次使用需在介面內新增伺服器連線，連線 Host 填 `postgres`，帳密為 `.env` 的 `POSTGRES_USER` / `POSTGRES_PASSWORD`。
- **n8n**：http://localhost:5679，登入帳密為 `.env` 的 `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD`。
- **Redis**：`redis-cli -h localhost -p 6380 -a <REDIS_PASSWORD>`。

## n8n 工作流程備份與還原

`automation/n8n_data`（帳號、憑證、執行紀錄）不會進版控，但 `automation/workflows`（流程本身）會，兩者是分開管理的。流程確定穩定、要分享給其他人時，手動匯出一次並 commit 即可。

**匯出流程**（在自己電腦上，流程有更新時執行）：

```bash
docker exec ai-talent-project-n8n-1 n8n export:workflow --all --separate --output=/home/node/workflows/
```

會把 n8n 裡每一個工作流程各自匯出成一個 JSON 檔，寫到本機的 `automation/workflows/`（對應容器內的 `/home/node/workflows`）。接著照一般流程 `git add automation/workflows` → `git commit` → `git push` 即可。

**匯入流程**（別人 `git clone` 專案、`docker compose up -d` 起完環境後執行）：

```bash
docker exec ai-talent-project-n8n-1 n8n import:workflow --separate --input=/home/node/workflows/
```

`automation/workflows/` 裡的 JSON 會被還原成 n8n 網頁上的工作流程，不需要重新手動建立。

> 注意：匯出的 JSON 不含節點裡設定的憑證（資料庫密碼、API key 等）。流程 import 後若有用到憑證的節點會顯示「未設定憑證」，需要各自在自己的 n8n 重新填一次；不需要憑證的 node（例如呼叫 backend 的 HTTP Request node）則 import 完可以直接用。

## n8n 呼叫後端 API 的金鑰

「只給 n8n 用」的後端 API（例如抓取銀行利率）需要固定金鑰：請求標頭 `X-API-Key` 必須等於 `.env` 的 `N8N_API_KEY`，否則回 401（後端沒設定金鑰時回 503）。

**產生金鑰**：使用密碼學安全的隨機數產生 32 bytes（256 位元）。Windows 在 PowerShell 執行（使用 Git 內建的 openssl；Git 安裝在別處時，請改成實際路徑）：

```powershell
& "C:\Program Files\Git\usr\bin\openssl.exe" rand -base64 32
```

macOS／Linux／Git Bash 可直接執行 `openssl rand -base64 32`。把輸出的整行字串貼到 `.env` 的 `N8N_API_KEY=` 後面，不要 commit，也不要貼到聊天或截圖中。更換金鑰時，`.env` 與 n8n 的 Header Auth 憑證要一起改，再執行 `docker compose up -d backend`。

n8n 端設定（一次即可，在 n8n 網頁操作）：

1. **複製金鑰**：用編輯器開啟專案根目錄的 `.env`，複製 `N8N_API_KEY=` 後面的整段字串（不含 `N8N_API_KEY=`，前後不要有空格或換行）。
2. **開啟流程**：瀏覽器進入 n8n（見〈存取各服務〉），登入後點開要使用的工作流程，雙擊呼叫後端的 **HTTP Request** 節點。
3. **選擇驗證方式**：在節點的 **Authentication** 選 **Generic Credential Type**，接著 **Generic Auth Type** 選 **Header Auth**。
4. **建立憑證**：**Header Auth** 欄位點 **Create new credential**，在彈出的視窗填入：
   - **Name**：`X-API-Key`（這是標頭名稱，必須完全一致，大小寫不拘）
   - **Value**：貼上步驟 1 複製的金鑰
   - 視窗上方的憑證名稱可改成「Backend API Key」，方便辨識
5. 點 **Save** 儲存憑證，回到節點確認 **Header Auth** 欄位已選到這組憑證。
6. 點節點的 **Execute step** 測試：回傳利率資料代表成功；回傳 401 代表金鑰貼錯或有多餘空白，回傳 503 代表後端沒讀到 `N8N_API_KEY`（改完 `.env` 後要執行 `docker compose up -d backend`）。
7. 儲存工作流程（右上角 **Save**）。

之後其他節點要呼叫後端的專用 API 時，Header Auth 欄位直接選這組已建立的憑證即可，不用重貼金鑰。

注意：
- 憑證不會被匯出到 `automation/workflows`，其他人匯入流程後，需要在自己的 n8n 依上述步驟重建這組憑證。
- 更換金鑰時，回到 n8n 左側 **Credentials**，開啟這組憑證，更新 **Value** 後儲存。

## n8n 時區

`docker-compose.yml` 已為 n8n 設定 `GENERIC_TIMEZONE=Asia/Taipei` 與 `TZ=Asia/Taipei`，所有工作流程（含排程觸發）預設使用台北時間；更改設定後需 `docker compose up -d n8n` 重建容器。若個別流程在 **Settings → Timezone** 手動指定過其他時區，會覆蓋預設值，需改回 *Default* 。

## n8n 排程呼叫的抓取功能

後端提供三項「只給 n8n 呼叫」的抓取功能，實際 API 路徑請看後端 API 文件頁（見〈存取各服務〉）。n8n 只負責排程啟動與顯示結果，呼叫時除了金鑰不需帶任何參數：

| 功能 | 說明 |
| ---- | ---- |
| 抓取五大公股銀行利率 | 取得 1 年期定存機動利率，覆寫資料庫中唯一一列 |
| 抓取股票基本資料 | 取得上市櫃股票與 ETF 的代號、名稱、市場別、產業別（含大盤指數），已存在的代號直接覆寫 |
| 抓取每日股價與大盤指數 | 依股票基本資料建立清單（上市、上櫃向 yfinance 抓，指數向證交所抓；基本資料是空的就什麼都不抓），抓取個股還原收盤價與大盤報酬指數，起訖日由後端自行決定（首次上線抓保留期，預設 10 年，之後個股與大盤都只抓近 1 個月；個股若因除權息使還原價基準改變，後端會自動整檔重抓（不需 n8n 處理，也不回報）），同一代號同一天直接覆寫，全部成功後清除超過 10 年又 31 天的舊資料 |

**建議執行順序**：先抓股票基本資料，再抓每日股價與大盤指數（後者依前者的清單抓取）。

**回傳欄位**（三項一致，n8n 可直接顯示；不含時間，時間由 n8n 自己取得）：`message`（抓取訊息）、`status`（成功／失敗）、`success_count`（成功筆數）、`fail_count`（失敗筆數），失敗時另有 `error`（原因）。每日股價的「筆」以代號計（一檔股票或大盤指數算一筆），另附 `stock_success_count`／`index_success_count`（個股與大盤各自的成功筆數）、`rows_written`（實際寫入列數）與 `failed`（失敗的代號、名稱與原因）、`no_data_count`／`no_data`（Yahoo 本來就沒有價格的筆數與清單，含代號與名稱，不算失敗）。

**中斷與被擋的處理**：每個來源失敗會自動重試；每一批抓完立即寫入資料庫；失敗的部分維持舊資料不動、下次執行會整段補回；連續多批失敗會判定被封鎖並中止；同一時間只允許執行一次。有任何失敗時回傳失敗狀態，讓 n8n 依流程重試或通知。日常執行約數分鐘；首次上線要抓 10 年，需數十分鐘，n8n 呼叫節點的逾時（Timeout）請設 60 分鐘以上。

## 常用指令

```bash
# 查看所有服務日誌
docker compose logs -f

# 查看單一服務日誌
docker compose logs -f backend

# 重啟單一服務
docker compose restart backend

# 停止所有服務（保留資料）
docker compose down

# 停止並清除所有資料（危險操作，會刪除本地掛載目錄以外的匿名 volume；本地掛載目錄需手動刪除）
docker compose down -v
```

## 環境變數

所有帳密與連接埠設定都集中在 `.env`（見 `.env.example` 範本），包含：

- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT`
- `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` / `PGADMIN_PORT`
- `REDIS_PASSWORD` / `REDIS_PORT`
- `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` / `N8N_PORT` / `N8N_API_KEY`（n8n 呼叫後端專用 API 的金鑰，見下方〈n8n 呼叫後端 API 的金鑰〉）
- `FRONTEND_PORT` / `BACKEND_PORT`
- `ANALYSIS_MAX_LOOKBACK_YEARS` / `PRICE_RETENTION_BUFFER_DAYS`（日行情資料的保留年數與額外緩衝天數，預設 10 年與 31 天；也決定首次抓取的區間，不設定則用預設值，設定不合法時後端無法啟動）

正式分享或部署前，請務必修改 `.env` 中的預設密碼。

## 開發備註

- frontend、backend 皆以 bind mount 方式掛進容器（`./frontend:/app`、`./backend:/app`），修改本機程式碼即時生效（熱重載），不需要重新 build image。
- 新增前端套件（`npm install <pkg>`）或後端套件（更新 `requirements.txt`）後，需要重新建置對應 image：
  ```bash
  docker compose up -d --build frontend
  docker compose up -d --build backend
  ```
- PostgreSQL 18+ image 的資料掛載路徑為 `/var/lib/postgresql`（非舊版的 `.../data`），對應本地目錄為 `database/postgres_data`。
