# 030 · 風險分析報告頁與歷史紀錄頁前端

- **Commit**：`a69db8b`（PR #20）　**日期**：2026-09-28　**作者**：POCHUN-CHUNG
- **一句話總結**：完成風險分析的前端畫面：新增風險分析報告頁、歷史紀錄頁與投資組合詳情頁的「歷史分析報告」區塊；報告 Prompt 更新到 1.3.0，規格書更新到 v1.13.0。

## 白話說明

- **風險分析報告頁**：按「開始分析」後直接進入報告。由上而下依序是分析條件、綜合診斷、六張風險指標卡（附大盤數值、白話比較與說明框）、四段白話說明（虧損風險、集中與分散、報酬效率與市場連動、個人投資條件適配度），以及建議檢視重點與目前的庫存明細。
- **三張圖表**：回撤走勢、相關係數熱圖、風險貢獻度。看圖方式放在標題旁的說明框（名詞解釋＋閱讀指引），圖的下方不放文字，本次資料的觀察由 AI 寫進上方段落。
- **報告產生中**：與風險屬性頁相同，只顯示標題、提示語、轉圈圈與外框光暈，完成後一次顯示；產生失敗時可按「重新產生」。
- **歷史紀錄頁**：列出過去每一次分析，可依投資組合篩選、分頁；卡片右上角的「⋯」選單可以刪除該次分析（刪除前會先確認）。
- **投資組合詳情頁**：新增「歷史分析報告」區塊，顯示該組合最近 3 次分析與「查看全部」。
- **AI 報告的寫法**：綜合診斷改為先講結論再說重點；各段加入確認過的語氣範例；比較說法統一為「風報比優於／不如大盤」，大盤稱呼統一為「大盤（台股加權報酬指數）」；所有文字一律使用臺灣用語。
- **手機排版**：導覽列變矮、離邊緣更近，卡片內距與字級比照其他頁面，表格與提示不再超出卡片。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `frontend/src/pages/AnalysisReport.tsx`、`.module.css` | 新增 | 風險分析報告頁：顯示一次分析的完整結果與 AI 報告，並在報告產生中時等候、失敗時可重新產生。 |
| `frontend/src/components/AnalysisCharts.tsx`、`.module.css` | 新增 | 報告頁的三張圖：回撤走勢、相關係數熱圖、風險貢獻度（Nivo）。 |
| `frontend/src/components/AnalysisCard.tsx`、`.module.css` | 新增 | 一筆歷史分析的卡片（歷史紀錄頁與組合詳情頁共用），含刪除選單。 |
| `frontend/src/components/HoldingsTable.tsx` | 新增 | 庫存明細表格，組合詳情頁與報告頁共用。 |
| `frontend/src/analysis.ts` | 新增 | 風險分析畫面共用的資料型別、指標說明文字與數值格式。 |
| `frontend/src/keepInPlace.ts` | 新增 | 「顯示其餘／收合」按鈕收合時，讓畫面停在原本的位置。 |
| `frontend/src/pages/History.tsx`、`.module.css` | 修改 | 歷史紀錄頁：分析清單、依組合篩選、分頁與刪除後重新載入。 |
| `frontend/src/pages/PortfolioDetail.tsx`、`.module.css` | 修改 | 投資組合詳情頁：新增歷史分析報告區塊，庫存明細改用共用表格。 |
| `frontend/src/pages/RiskAnalysis.tsx`、`.module.css` | 修改 | 風險分析頁：開始分析後直接進入報告頁，錯誤改用彈窗顯示，報酬基準選項文字更新。 |
| `frontend/src/pages/RiskProfile.*`、`components/ui/PageSpinner.*` | 修改 | 分析中的轉圈圈改為兩頁共用，位置一致且不撐高頁面。 |
| `frontend/src/components/PortfolioCharts.*` | 修改 | 走勢圖的刻度與十字游標設定改為可共用（報告頁的回撤走勢沿用）。 |
| `frontend/src/components/layout/*`、`styles/tokens.css` | 修改 | 手機下方導覽列的大小與位置、頁面底部預留空間。 |
| `frontend/src/App.tsx` | 修改 | 新增報告頁路由，舊網址自動轉到新網址。 |
| `frontend/package.json`、`package-lock.json` | 修改 | 新增熱圖用的圖表套件。 |
| `backend/app/routers/analysis.py` | 修改 | 新增刪除一次分析的 API（需登入、只能刪自己的）。 |
| `backend/app/services/analysis_ai.py` | 修改 | AI 報告不再輸出圖說，新增禁用字詞，刪除分析時一併清除「產生中」標記。 |
| `backend/app/services/risk_metrics.py` | 修改 | 大盤的 Beta 對照值固定為 1；相關係數圖的標題更名。 |
| `spec/prompts/*`、`backend/app/prompts/*` | 修改 | 風險分析報告 Prompt 1.3.0、風險屬性 Prompt 6.7.0（加入臺灣用語規則）。 |
| `tests/test_analysis_ai.py`、`tests/test_risk_metrics.py` | 修改 | 配合報告格式與大盤 Beta 的改動。 |
| `DESIGN.md`、`SPEC.md`、`spec/*` | 修改 | 設計系統與規格書 v1.13.0（決策 D-144～D-163）。 |
| `CLAUDE.md` | 修改 | 新增「一律使用臺灣用語」規範。 |
| `README.md`、`changelog/029`、`changelog/README.md` | 修改／新增 | 說明文件更新；補上 PR #19 的版本說明。 |

## 技術備註

- 刪除分析會連同 AI 報告一起刪除（資料庫層級串聯刪除）；報告若仍在背景產生，寫回時找不到資料會自動略過。
- 較早產生的分析快照沒有存大盤 Beta 對照值，前端會自動補上 1。
- 舊報告仍含已停用的圖說欄位，前端會直接忽略，不需要轉換資料。
