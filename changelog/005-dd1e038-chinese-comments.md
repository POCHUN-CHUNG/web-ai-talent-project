# 005 · 加入中文註解與 API 摘要

- **Commit**：`dd1e038`　**日期**：2026-09-20　**作者**：POCHUN-CHUNG
- **一句話總結**：替後端與前端程式加上逐步的中文註解，並為 API 文件頁加上中文摘要。**沒有改變任何功能。**

## 白話說明

讓不熟程式的成員也能讀懂程式碼：每個函式前有「【名稱】做什麼」與參數說明，重要步驟以 1. 2. 3. 標示。
後端 API 文件頁（`/docs`）的每個端點也都有中文標題。程式行為完全沒變。

## 變更檔案（全為修改，僅增加註解／摘要）

| 檔案 | 檔案本身的用途 |
| ---- | -------------- |
| `backend/app/main.py` | 後端進入點：建立應用程式、CORS、資料表、掛上各 API。 |
| `backend/app/db.py` | PostgreSQL 與 Redis 連線設定。 |
| `backend/app/models.py` | 使用者資料表定義。 |
| `backend/app/security.py` | 密碼加密比對與登入通行證處理。 |
| `backend/app/routers/auth.py` | 登入／註冊／登出／修改密碼 API（新增中文 API 摘要）。 |
| `backend/app/routers/bank_rates.py` | 銀行利率 API（新增中文 API 摘要）。 |
| `backend/app/services/bank_rates.py` | 五家銀行利率爬取邏輯。 |
| `frontend/src/main.tsx` | 前端進入點。 |
| `frontend/src/App.tsx` | 前端路由設定。 |
| `frontend/src/api.ts` | 呼叫後端的統一函式與錯誤類別。 |
| `frontend/src/auth.tsx` | 全站登入狀態與登入守門元件。 |
| `frontend/src/pages/Landing.tsx` | 登入／註冊頁。 |
| `frontend/src/pages/Home.tsx` | 登入後首頁。 |
| `frontend/src/pages/Settings.tsx` | 使用者設定頁（修改密碼）。 |
| `frontend/vite.config.ts` | Vite 開發伺服器設定。 |

## 技術備註

- 註解風格已整理成規範，寫在專案根目錄 `CLAUDE.md` 的「程式碼註解規範」。
