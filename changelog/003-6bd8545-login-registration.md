# 003 · 登入／註冊系統

- **Commit**：`6bd8545`　**日期**：2026-09-19　**作者**：POCHUN-CHUNG
- **一句話總結**：新增使用者註冊、登入、登出、修改密碼，前後端與資料庫一次到位。

## 白話說明

網站現在有會員系統了：使用者可以註冊帳號、登入、看到自己的首頁、修改密碼、登出。密碼不會被明文存放（會加密成
無法還原的密文），登入狀態則存在快取（Redis）裡，7 天內不用重新登入。

## 後端

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `backend/app/routers/auth.py` | 新增 | 會員 API：`/auth/register` 註冊、`/login` 登入、`/logout` 登出、`/me` 查詢目前登入者、`/change-password` 修改密碼。 |
| `backend/app/security.py` | 新增 | 密碼加密與比對（argon2）、建立／清除登入通行證（cookie + Redis）、取得目前登入者。 |
| `backend/app/models.py` | 新增 | 定義「使用者」資料表（編號、帳號、加密密碼、註冊時間）。 |
| `backend/app/db.py` | 新增 | 建立 PostgreSQL 與 Redis 連線，提供每個請求使用的資料庫連線。 |
| `backend/app/main.py` | 修改 | 啟動時自動建立資料表、設定 CORS、掛上登入 API。 |
| `backend/requirements.txt` | 修改 | 新增資料庫（SQLAlchemy 等）、Redis、argon2 相關套件。 |

## 前端

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `frontend/src/api.ts` | 新增 | 統一的後端呼叫函式，並帶上登入通行證。 |
| `frontend/src/auth.tsx` | 新增 | 全站共用的登入狀態，以及「未登入就導向登入頁」的守門元件。 |
| `frontend/src/pages/Landing.tsx` | 新增 | 登入／註冊頁（同一畫面依模式切換）。 |
| `frontend/src/pages/Home.tsx` | 新增 | 登入後的首頁，含設定連結與登出按鈕。 |
| `frontend/src/pages/Settings.tsx` | 新增 | 使用者設定頁，可修改密碼。 |
| `frontend/src/App.tsx` | 修改 | 設定「哪個網址顯示哪個頁面」（路由）。 |
| `frontend/package.json` | 修改 | 新增前端路由套件（react-router-dom）。 |
| `frontend/package-lock.json` | 新增 | 鎖定前端套件的確切版本，確保每個人安裝結果一致（自動產生，不需手改）。 |

## 設定

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `docker-compose.yml` | 修改 | 後端加上資料庫／Redis／前端網址等環境變數；PostgreSQL 加上健康檢查，後端等資料庫就緒才啟動。 |
| `.env.example` | 修改 | 新增 `COOKIE_SECURE`（正式環境用 HTTPS 時設為 true）。 |

## 技術備註

- 帳號不存在時仍會執行一次假的密碼驗證，避免用回應時間推測帳號是否存在。
- 登入通行證放在 cookie，有效期 7 天。
