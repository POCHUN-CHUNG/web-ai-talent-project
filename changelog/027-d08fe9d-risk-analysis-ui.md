# 027 · 風險分析頁前端改版與全站 UI 修正

- **Commit**：`d08fe9d`（PR #17）　**日期**：2026-09-28　**作者**：POCHUN-CHUNG
- **一句話總結**：風險分析頁做出分析前的確認畫面，並一次修正全站載入畫面、導覽列、登入、投資組合圖表與手機版排版等多項細節；規格書更新到 v1.11.0。

## 白話說明

- **風險分析頁**：分析前可以確認與調整四件事——風險屬性（投資期限、提款可能性、可接受跌幅）、要分析的投資組合、分析期間（滑桿以 1 個月為單位，並顯示真正有股價資料的起訖日）、報酬基準。選好且可以分析時才出現「開始分析」按鈕；持股歷史股價未滿 2 年時，直接告訴使用者是哪幾檔。
- **全站載入畫面**：資料還在載入時，只顯示頁面標題和畫面中間的轉圈圈，不會再閃過半成品的畫面。
- **導覽列**：修正分頁的白色指示條有時停在錯的分頁上。
- **登入與帳號**：欄位都填好時按 Enter 就能登入；還沒填問卷的帳號登入後直接到風險屬性頁；新密碼不能和舊密碼一樣。
- **投資組合**：「最新日損益」改成這個組合當天的損益（當天才買的股票當天算 0）；資料不到 2 天時不顯示圖表；走勢圖一個月內每週一個刻度、拿掉水平指示線；新增持股時用 Enter 選好股票後會直接打開日期。
- **手機版**：區塊間距統一為 16px，中文字最小 12px。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `frontend/src/pages/RiskAnalysis.*` | 修改 | 風險分析頁：分析前的確認畫面（風險屬性、投資組合、分析期間、報酬基準）。 |
| `frontend/src/components/ui/Select.*`、`Slider.*`、`PageSpinner.*` | 新增 | 共用元件：全站統一外觀的下拉選單、滑桿、頁面載入中的轉圈圈。 |
| `frontend/src/components/ui/IconButton.*`、`Input.module.css`、`InfoPopover.module.css`、`Card.module.css` | 修改 | 共用元件：輸入框內的小尺寸圖示按鈕、說明小框寬度隨內容調整、卡片毛玻璃效果修正。 |
| `frontend/src/components/layout/TopBar.*` | 修改 | 頂端導覽列：指示條在字型載入、視窗改變時重新定位；手機分頁文字放大到 12px。 |
| `frontend/src/components/PortfolioCharts.*` | 修改 | 投資組合圖表：刻度、指示線、對齊與資料不足時的處理。 |
| `frontend/src/components/LotForm.*`、`TradeDatePicker.*` | 修改 | 新增買進紀錄視窗：標的輸入框外觀、選好股票後自動開啟日期。 |
| `frontend/src/pages/PortfolioDetail.*`、`Portfolios.*` | 修改 | 投資組合明細頁與總覽頁：載入畫面、圖表顯示條件、標題列與間距。 |
| `frontend/src/pages/Login.tsx`、`Settings.*`、`auth.tsx`、`formKeys.ts` | 修改 | 登入後依問卷狀態導向、Enter 直接送出、修改密碼的檢查。 |
| `frontend/src/pages/Questionnaire.*`、`RiskProfile.*`、`History.module.css`、`styles/tokens.css` | 修改 | 其他頁面的載入畫面、手機版間距，以及導覽列高度等設計變數。 |
| `backend/app/services/analysis.py`、`routers/analysis.py`、`models.py` | 修改 | 風險分析：分析期間改為 1 個月精度、回傳全部交易日、錯誤訊息改寫。 |
| `backend/app/services/portfolio.py` | 修改 | 最新日損益改為組合當天的損益。 |
| `backend/app/routers/auth.py` | 修改 | 修改密碼時拒絕與舊密碼相同的新密碼。 |
| `backend/app/services/stock_info.py` | 修改 | 大盤指數 IR0001 的名稱改為「加權股價報酬指數」。 |
| `tests/test_portfolio.py` | 修改 | 新增最新日損益的自動測試。 |
| `DESIGN.md`、`README.md`、`SPEC.md`、`spec/*` | 修改 | 設計規範、說明文件與規格書 v1.11.0（決策 D-129～D-134）。 |
| `changelog/026`、`changelog/README.md`、`.gitignore` | 新增／修改 | 補上 PR #16 的版本說明；不再把 Python 快取檔加入版控。 |

## 技術備註

- 資料表 `analysis_results.requested_years` 由 `SMALLINT` 改為 `NUMERIC(7,4)`；專案沒有資料庫遷移工具，既有資料庫需手動執行 PR #17 說明中的 SQL。
- 分析期間顯示的起始日是「範圍內最早一個有資料的交易日」，與後端實際採用的日期一致（D-130）。
