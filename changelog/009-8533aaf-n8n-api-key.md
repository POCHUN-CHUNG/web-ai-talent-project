# 009 · n8n 金鑰驗證與時區

- **Commit**：`8533aaf`　**日期**：2026-09-20　**作者**：POCHUN-CHUNG
- **一句話總結**：「只給 n8n 呼叫」的後端 API 加上金鑰驗證，並把 n8n 的時區設為台北時間。

## 白話說明

抓取銀行利率的 API 原本任何人都能呼叫。現在必須在請求標頭帶上正確的金鑰（`X-API-Key`，值放在 `.env` 的 `N8N_API_KEY`）才能執行；後端沒設定金鑰時一律拒絕。n8n 的排程也改用台北時間。同時補上 API 存取控制與 README 不寫機密的開發規範。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `backend/app/security.py` | 修改 | 新增 n8n 金鑰檢查：比對請求標頭與 `.env` 的金鑰（固定時間比對，未設定金鑰時拒絕）。 |
| `backend/app/routers/bank_rates.py` | 修改 | 抓取銀行利率端點套用金鑰檢查。 |
| `docker-compose.yml` | 修改 | 把金鑰傳給後端容器，並把 n8n 時區設為 `Asia/Taipei`。 |
| `.env.example` | 修改 | 新增 `N8N_API_KEY` 範本。 |
| `README.md` | 修改 | 新增金鑰產生方式與 n8n 端設定步驟、n8n 時區說明。 |
| `CLAUDE.md` | 修改 | 新增「後端 API 存取控制」與「README 不寫入機密」兩項規範。 |
| `changelog/007`、`008`、`README.md` | 新增／修改 | 補上版本 007～008 的變更說明與索引。 |
