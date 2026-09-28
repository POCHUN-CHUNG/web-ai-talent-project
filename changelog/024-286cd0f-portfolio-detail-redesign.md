# 024 · 投資組合明細頁改版與全站 UI 規範

- **Commit**：`286cd0f`（PR #15）　**日期**：2026-09-27　**作者**：POCHUN-CHUNG
- **一句話總結**：投資組合明細頁大改版（總覽、歷史走勢、資產配置、庫存明細），並統一全站彈出視窗、表單與「無資料顯示 N/A」的介面規範。

## 白話說明

- **明細頁總覽**：最上方顯示目前總額與四張指標小卡（含迷你趨勢圖）。
- **歷史走勢**：加入「走勢與損益對照」圖，滑鼠移過會出現十字線與數值。
- **資產配置**：用圓餅圖看市場別、資產類別，用樹狀圖看產業別，熱力圖看個股。
- **庫存明細**：列出每筆買進紀錄，可展開編輯或刪除。
- **新增／修改買進紀錄**：改為彈出視窗，可直接搜尋股票；日期選擇器改版；股價會自動帶入。
- **全站規範**：表單按 Enter 跳下一欄；沒有值的欄位一律顯示「N/A」；統一彈出視窗與提示框。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `backend/app/routers/portfolios.py` | 修改 | 投資組合 API，新增「每日市值與損益走勢」的查詢。 |
| `backend/app/services/portfolio.py`、`portfolio_data.py` | 修改 | 計算持股部位、總覽與歷史走勢的程式，以及查詢股價的共用函式。 |
| `frontend/src/pages/PortfolioDetail.*` | 修改 | 投資組合明細頁：總覽、走勢、配置圖與庫存明細。 |
| `frontend/src/components/PortfolioCharts.*` | 修改 | 明細頁的所有圖表（走勢圖、環形圖、樹狀圖、熱力圖）。 |
| `frontend/src/components/LotForm.*`、`TradeDatePicker.*`、`PortfolioDialogs.*` | 修改 | 新增／修改買進紀錄的視窗、日期選擇器，以及改名、刪除的確認視窗。 |
| `frontend/src/components/ui/InfoPopover.*`、`MoreMenu.*`、`Notice.*` | 新增 | 共用元件：手機版的說明小視窗、「⋮」更多選單、提示框。 |
| `frontend/src/components/ui/Modal.*`、`AlertDialog.*`、`IconButton.*` | 修改 | 共用的彈出視窗、提示視窗與圖示按鈕，套用新的全站規則。 |
| `frontend/src/formKeys.ts`、`format.ts` | 新增／修改 | 表單按 Enter 處理與數字日期顯示格式（沒有值顯示 N/A）。 |
| `frontend/src/styles/tokens.css` | 修改 | 全站顏色、字級等設計變數（新增圖表配色）。 |
| `frontend/package.json` | 修改 | 加入圖表與日期選擇器套件。 |
| 其他相關檔案 | 修改 | 各項規格與設計規則更新。 |
| `tests/test_portfolio.py` | 修改 | 投資組合計算的自動測試。 |
| `changelog/023`、`changelog/README.md` | 新增／修改 | 補上 PR #14 的版本說明。 |

## 技術備註

- 圖表一律使用 Nivo；液態玻璃邊緣參考 iOS 27 Tab Bar；走勢圖的十字線畫在獨立圖層，滑鼠移動時不重畫底下的圖表。
