# 020 · 資料表欄位改名、股價永久保存、銀行利率改為一列一家

- **Commit**：`7cf2bb8`（PR #11）　**日期**：2026-09-24　**作者**：POCHUN-CHUNG
- **一句話總結**：整理多張資料表的欄位命名與結構，股價改為從 2003 年起完整抓取並永久保存。

## 白話說明

這一版主要在整理資料庫。使用者資料表的欄位改成更直白的名稱，並記錄密碼最後修改時間；每日股價不再只保留最近 10 年、也不再定期刪除舊資料，新股票會從 2003 年開始抓完整歷史，之後只更新、不刪除；股票基本資料分開記錄「第一次建立」與「真的有變動」的時間；銀行利率從「一列存五家」改成「一家一列」，比較好查也好擴充。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `backend/app/models.py` | 修改 | 資料表定義：使用者欄位改名與新增密碼修改時間、日行情新增最後抓取時間、股票基本資料拆成建立與更新時間、銀行利率改為一家一列。 |
| `backend/app/routers/auth.py` | 修改 | 登入註冊與改密碼 API，配合新的欄位名稱，改密碼時記錄修改時間。 |
| `backend/app/routers/bank_rates.py` | 修改 | 銀行利率抓取 API，配合一家一列的新結構寫入。 |
| `backend/app/routers/market_data.py`、`backend/app/services/market_data.py` | 修改 | 每日股價抓取：新股票從 2003-01-01 抓完整歷史，移除過期資料清理，只做新增與覆寫。 |
| `backend/app/services/stock_info.py` | 修改 | 股票基本資料同步：只有名稱、市場別、產業別真的改變時才更新時間。 |
| `docker-compose.yml`、`README.md` | 修改 | 移除已不需要的保留年數與緩衝天數環境變數。 |
| `.gitignore` | 修改 | 補上不進版控的項目。 |
| `changelog/019-3bc1b5d-portfolio-home.md`、`changelog/README.md` | 新增／修改 | 補上 PR #10 的版本說明。 |

## 技術備註

- 股價資料只做 upsert，不再有 purge；`ANALYSIS_MAX_LOOKBACK_YEARS`、`PRICE_RETENTION_BUFFER_DAYS` 已移除。
- `bank_rates` 由寬表（五個利率欄位）改為長表（`bank`, `rate`, `updated`）。
