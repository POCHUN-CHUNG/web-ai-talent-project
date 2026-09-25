# 021 · 液態玻璃介面改版與投資組合總覽強化

- **Commit**：`55a4283`（PR #12）　**日期**：2026-09-25　**作者**：POCHUN-CHUNG
- **一句話總結**：全站套用 Glass Console 設計系統與液態玻璃導覽列，並在投資組合總覽加入年化報酬與最新日損益。

## 白話說明

整個網站換上新的視覺：柔和的三色斜角漸層背景、半透明的玻璃卡片，以及可滑動、點選時有按壓效果的頂端（手機為底部）分頁列。登入、註冊與設定頁重新設計，帳號圖示改為下拉選單（設定、登出）；深色模式移除，只保留淺色。投資組合總覽頁每個組合會列出持有的股票，並顯示真實的年化報酬率與最新一日的損益（含相對前一日市值的百分比）。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `frontend/src/styles/tokens.css`、`global.css` | 新增 | 設計系統的所有顏色、字級、圓角、間距、陰影變數，以及全站共用的斜角漸層背景。 |
| `frontend/src/components/ui/*`（Button、Input、Card、Chip、IconButton、Icon、Modal） | 新增 | 共用介面元件，外觀一律取自設計變數。 |
| `frontend/src/components/layout/TopBar.*` | 新增 | 頂端（手機為底部）液態玻璃分頁列、滑動指示條與帳號下拉選單。 |
| `frontend/src/components/layout/TabsLayout.*`、`Footer.*`、`EntryPage.*`、`ScrollbarOverlay.*` | 新增 | 分頁共用外框（切換分頁時分頁列不重新載入）、頁尾版權、登入頁外框、不佔版面寬度的自訂捲軸。 |
| `frontend/src/pages/Login.*`（原 `Landing.tsx`） | 新增 | 登入／註冊頁，含密碼顯示切換、確認密碼與錯誤提示。 |
| `frontend/src/pages/Settings.*` | 修改 | 設定頁：基本資料、修改密碼、登出。 |
| `frontend/src/pages/Portfolios.*`（原 `Home.tsx`） | 新增 | 投資組合總覽：每個組合的持股標籤、市值、年化報酬、最新日損益與歷史總損益。 |
| `frontend/src/pages/RiskProfile.*`、`PortfolioDetail.tsx`、`Questionnaire.tsx` | 修改 | 套用新版面與元件。 |
| `frontend/src/App.tsx`、`main.tsx`、`index.html`、`format.ts` | 修改 | 路由改用共用外框、首頁改名為投資組合頁、字型載入與格式工具。 |
| `backend/app/routers/portfolios.py`、`services/portfolio.py`、`services/portfolio_data.py` | 修改 | 總覽 API 補上持股清單、年化報酬、最新日損益。 |
| `DESIGN.md`、`README.md` | 修改 | 設計規範改為液態玻璃、僅淺色模式；README 補充說明。 |

## 技術備註

- 深色模式完全移除（`theme.ts`、各處 dark 樣式與 DESIGN.md 相關段落）。
- 一般按鈕與輸入框維持扁平樣式，液態玻璃只用在導覽列、選單、彈出視窗與登入卡。
