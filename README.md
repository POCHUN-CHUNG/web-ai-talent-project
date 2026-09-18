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
├── frontend/                # React 原始碼
├── backend/                 # FastAPI 原始碼
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
- **後端 API 文件**：http://localhost:8001/docs（健康檢查：`GET /health`）
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
- `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` / `N8N_PORT`
- `FRONTEND_PORT` / `BACKEND_PORT`

正式分享或部署前，請務必修改 `.env` 中的預設密碼。

## 開發備註

- frontend、backend 皆以 bind mount 方式掛進容器（`./frontend:/app`、`./backend:/app`），修改本機程式碼即時生效（熱重載），不需要重新 build image。
- 新增前端套件（`npm install <pkg>`）或後端套件（更新 `requirements.txt`）後，需要重新建置對應 image：
  ```bash
  docker compose up -d --build frontend
  docker compose up -d --build backend
  ```
- PostgreSQL 18+ image 的資料掛載路徑為 `/var/lib/postgresql`（非舊版的 `.../data`），對應本地目錄為 `database/postgres_data`。
