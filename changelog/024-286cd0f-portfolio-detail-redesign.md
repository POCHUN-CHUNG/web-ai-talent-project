# 024 · 投資組合明細頁改版與全站 UI 規範整理

- **Commit**：`286cd0f`（PR #15）　**日期**：2026-09-27　**作者**：POCHUN-CHUNG
- **一句話總結**：投資組合明細頁改成「總覽、歷史走勢、資產與產業配置、庫存明細」四大區塊，買進紀錄改用彈出視窗輸入，並訂下「沒有值一律顯示 N/A」等全站介面規則。

## 白話說明

- **明細頁總覽**：最上方顯示目前總市值與四張指標小卡（含迷你走勢圖）。
- **歷史走勢**：可切換「市值變化／損益變化」與時間區間，滑過圖表時有看盤式十字線。
- **配置圖**：用環形圖看市場別、證券別占比，用樹狀圖看產業別，用熱力圖看每檔個股。
- **庫存明細**：每檔股票一列，可展開看每一筆買進紀錄並修改、刪除。
- **新增／修改買進紀錄**：改成彈出視窗；搜尋股票可用鍵盤上下選、Enter 帶入；日期選擇器改為 iOS 風格；股數只能是整數；每股價格與成本由系統自動帶入。
- **全站規則**：沒有值的地方一律顯示「N/A」；彈出視窗、提示視窗、說明小框、更多選單等共用元件統一規格。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `backend/app/routers/portfolios.py` | 修改 | 投資組合 API：明細回傳產業別／市場別／證券別、最新日損益與資料更新時間，新增每日走勢 API。 |
| `backend/app/services/portfolio.py`、`portfolio_data.py` | 修改 | 計算每日市值與損益走勢、年化報酬率；股數必須為大於 0 的整數。 |
| `frontend/src/pages/PortfolioDetail.*` | 修改 | 投資組合明細頁：總覽、歷史走勢、配置圖、庫存明細。 |
| `frontend/src/components/PortfolioCharts.*` | 修改 | 明細頁的各種圖表（走勢圖、環形圖、樹狀圖、熱力圖）。 |
| `frontend/src/components/LotForm.*`、`PortfolioDialogs.*`、`TradeDatePicker.*` | 修改／新增 | 新增與修改買進紀錄的彈出視窗、股票搜尋與日期選擇器。 |
| `frontend/src/components/ui/Modal.*`、`AlertDialog.*`、`IconButton.*` | 修改 | 共用的彈出視窗、提示視窗與圖示按鈕，統一規格。 |
| `frontend/src/components/ui/InfoPopover.*`、`MoreMenu.*`、`Notice.*` | 新增 | 共用的說明小框、「更多」選單與提示條。 |
| `frontend/src/format.ts`、`formKeys.ts` | 修改／新增 | 數字與日期的顯示格式（沒有值顯示 N/A）、表單鍵盤操作。 |
| `frontend/src/pages/Portfolios.*`、`RiskAnalysis.*`、`RiskProfile.*`、`Settings.*`、`Login.*`、`Questionnaire.*` | 修改 | 其他頁面配合新規格的調整。 |
| `frontend/src/components/layout/TopBar.*`、`RiskProfileGateModal.*`、`frontend/src/styles/tokens.css`、`App.tsx`、`auth.tsx` | 修改 | 頂部導覽列、未完成評估提示視窗、設計變數與路由的調整。 |
| `frontend/package.json`、`package-lock.json` | 修改 | 前端套件清單。 |
| `CLAUDE.md`、`DESIGN.md`、`README.md` | 修改 | 新增「沒有值一律顯示 N/A」規則（CLAUDE.md §10）與各元件設計規則。 |
| `spec/03-contract.md`、`spec/04-behavior.md` | 修改 | 規格同步更新（明細與走勢 API、畫面規格）。 |
| `tests/test_portfolio.py` | 修改 | 投資組合計算的自動測試。 |
| `changelog/023`、`changelog/README.md` | 新增／修改 | 補上 PR #14 的版本說明。 |

## 技術備註

- 圖表一律使用 Nivo；液態玻璃邊緣參考 iOS 27 Tab Bar。
