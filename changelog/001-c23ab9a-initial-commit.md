# 001 · Initial commit：專案骨架

- **Commit**：`c23ab9a`　**日期**：2026-09-18　**作者**：POCHUN-CHUNG
- **一句話總結**：用 Docker Compose 一次啟動前端、後端、資料庫、快取、自動化五類服務的開發環境骨架。

## 白話說明

這一版還沒有任何實際功能，只是把「房子的地基」蓋好：執行一個指令就能把網站畫面、後端程式、資料庫、快取、
自動化工具全部啟動起來，並且約定好帳密與資料放在哪裡。

## 變更檔案（全部新增）

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `docker-compose.yml` | 新增 | 定義所有服務（前端、後端、PostgreSQL、pgAdmin、Redis、n8n）如何啟動與連線。 |
| `.env.example` | 新增 | 帳號密碼與連接埠的範本；複製成 `.env` 後填入實際值。 |
| `.gitignore` | 新增 | 告訴 git 哪些檔案不要上傳（`.env` 機密、資料庫資料、node_modules 等）。 |
| `.gitattributes` | 新增 | 統一換行字元等 git 檔案處理規則。 |
| `README.md` | 新增 | 專案總說明：服務架構、啟動步驟、常用指令。 |
| `backend/Dockerfile` | 新增 | 後端容器的建置說明（Python 3.13 + uvicorn）。 |
| `backend/.dockerignore` | 新增 | 建置後端容器時要略過的檔案。 |
| `backend/requirements.txt` | 新增 | 後端需要安裝的 Python 套件清單。 |
| `backend/app/__init__.py` | 新增 | 讓 `app` 資料夾成為 Python 套件（空檔）。 |
| `backend/app/main.py` | 新增 | 後端程式進入點，先提供健康檢查 `GET /health`。 |
| `frontend/Dockerfile` | 新增 | 前端容器的建置說明（Node 24）。 |
| `frontend/.dockerignore` | 新增 | 建置前端容器時要略過的檔案。 |
| `frontend/package.json` | 新增 | 前端專案設定與套件清單（React + Vite）。 |
| `frontend/vite.config.ts` | 新增 | Vite 開發伺服器設定。 |
| `frontend/index.html` | 新增 | 網頁的 HTML 外殼。 |
| `frontend/src/main.tsx` | 新增 | 前端程式進入點，把 React 掛到網頁上。 |
| `frontend/src/App.tsx` | 新增 | 前端根元件（此時僅為佔位畫面）。 |
| `cache/README.md` | 新增 | Redis 快取服務的說明。 |
| `database/postgres_data/.gitkeep`、`database/pgadmin_data/.gitkeep`、`automation/n8n_data/.gitkeep` | 新增 | 空檔，用來讓 git 保留這三個「資料掛載資料夾」（實際資料不上傳）。 |

## 技術備註

- 所有連接埠都比預設值 +1，避免與本機其他服務衝突。
- 資料以 bind mount 掛在專案資料夾內，整個專案複製到新機器即可還原資料。
