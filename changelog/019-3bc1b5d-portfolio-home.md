# 019 · 投資組合首頁、買進紀錄與組合詳情頁

- **Commit**：`3bc1b5d`（PR #10）　**日期**：2026-09-21　**作者**：POCHUN-CHUNG
- **一句話總結**：新增投資組合首頁、買進紀錄（持股）管理與組合詳情頁，含損益與圖表。

## 白話說明

登入後可在首頁建立、刪除投資組合；進入組合詳情頁可新增／編輯／刪除「買進紀錄」（一次買進算一筆），系統會依股票代號與買進日期，用當天的還原收盤價自動算出成本，不用手動輸入價格。詳情頁會彙總每檔的平均成本、未實現損益、持有天數、年化報酬，並用圖表顯示資產配置與損益狀況；日期選擇器只能選有股價資料的交易日。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `backend/app/routers/portfolios.py` | 新增 | 投資組合與買進紀錄的 CRUD API（需登入、檢查擁有權與筆數上限）。 |
| `backend/app/services/portfolio.py` | 新增 | 買進紀錄的建立、更新、刪除與序列化邏輯；買進價一律取當天還原收盤價，無資料的日期會被拒絕。 |
| `backend/app/services/portfolio_data.py` | 新增 | 依持股彙總部位：平均成本、未實現損益、持有天數、年化報酬等計算。 |
| `backend/app/routers/stocks.py` | 修改 | 新增股票搜尋、可交易日期查詢、指定日期收盤價查詢等 API。 |
| `backend/app/models.py` | 修改 | 新增投資組合、買進紀錄兩張資料表。 |
| `frontend/src/pages/Home.tsx` | 修改 | 首頁列出使用者的所有投資組合，可新增與刪除。 |
| `frontend/src/pages/PortfolioDetail.tsx` | 新增 | 組合詳情頁：總覽數字、持股列表（可展開）、新增／編輯／刪除買進紀錄。 |
| `frontend/src/components/LotForm.tsx` | 新增 | 新增／編輯買進紀錄的表單。 |
| `frontend/src/components/TradeDatePicker.tsx` | 新增 | 只能選擇有股價資料交易日的日期選擇器。 |
| `frontend/src/components/PortfolioCharts.tsx` | 新增 | 資產配置與損益圖表（Nivo）。 |
| `frontend/src/format.ts` | 新增 | 金額、百分比、日期等顯示格式的共用工具。 |
| `frontend/src/api.ts`、`App.tsx`、`pages/RiskProfile.tsx` | 修改 | 串接新的投資組合相關 API 與頁面路由。 |
| `tests/test_portfolio.py` | 新增 | 買進紀錄與部位彙總計算的自動化測試。 |
| `README.md`、`SPEC.md`、`spec/*` | 修改 | 補充投資組合功能說明與規格，修正 C11 參考值為 0.4855。 |

## 技術備註

- 買進價格不接受使用者輸入，一律以「該股票在該日期」的還原收盤價為準；若該日期沒有股價資料，建立會被拒絕。
