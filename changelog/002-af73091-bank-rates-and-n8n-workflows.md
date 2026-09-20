# 002 · 銀行利率服務與 n8n 工作流程匯出

- **Commit**：`af73091`　**日期**：2026-09-18　**作者**：POCHUN-CHUNG
- **一句話總結**：新增「抓取五大公股銀行 1 年期定存利率」的後端功能，並把 n8n 自動化流程納入版控。

## 白話說明

後端多了一個功能：呼叫一次就會去五家銀行（臺灣銀行、合作金庫、土地銀行、華南銀行、第一銀行）的官網讀取最新的
1 年期定存機動利率。另外，n8n（自動化工具）做好的流程被匯出成檔案放進專案，其他人拿到專案就能匯入使用。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `backend/app/services/bank_rates.py` | 新增 | 五家銀行各一個爬取函式，加上彙整函式 `fetch_five_bank_rates()`，回傳各銀行利率。 |
| `backend/app/services/__init__.py` | 新增 | 讓 `services` 成為 Python 套件（空檔）。 |
| `backend/app/routers/bank_rates.py` | 新增 | 對外 API：`POST /bank-rates/fetch`，呼叫上面的服務並回傳結果。 |
| `backend/app/routers/__init__.py` | 新增 | 讓 `routers` 成為 Python 套件（空檔）。 |
| `backend/app/main.py` | 修改 | 把銀行利率 API 掛進後端。 |
| `backend/requirements.txt` | 修改 | 新增爬蟲需要的套件：beautifulsoup4、lxml、curl_cffi。 |
| `automation/workflows/7UTgcmJT1wZZZFBS.json` | 新增 | 從 n8n 匯出的工作流程（不含帳密），可在其他電腦匯入。 |
| `automation/workflows/.gitkeep` | 新增 | 讓 git 保留這個資料夾。 |
| `docker-compose.yml` | 修改 | n8n 多掛載 `automation/workflows`，並設定 `WEBHOOK_URL`。 |
| `references/fetch_bank_rates.py` | 新增 | 獨立的參考腳本，可不啟動後端直接執行、測試抓利率的邏輯。 |
| `README.md` | 修改 | 新增「n8n 工作流程備份與還原」章節。 |

## 技術備註

- 爬取使用 `curl_cffi` 模擬瀏覽器，避免被銀行網站擋下；解析用 BeautifulSoup + lxml。
- 匯出的工作流程不含憑證，匯入後需自行重填需要憑證的節點。
