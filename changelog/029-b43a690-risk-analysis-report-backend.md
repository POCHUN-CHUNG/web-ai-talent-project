# 029 · 風險分析報告 Prompt 與後端

- **Commit**：`b43a690`（PR #19）　**日期**：2026-09-28　**作者**：POCHUN-CHUNG
- **一句話總結**：完成請 AI 撰寫風險分析報告的 Prompt 與後端流程：分析完成後在背景產生報告，並新增查詢報告、重新產生與歷史清單的 API；規格書更新到 v1.12.0。

## 白話說明

- **AI 風險分析報告**：每次分析後，AI 會依後端算好的指標寫一份白話報告，內容包含綜合診斷（2–3 個主要風險特徵、最需要關注的風險來源）與五段說明（風險與報酬、虧損風險、集中與分散、市場敏感與風險來源、個人條件對齊）。AI 只解釋、不重新計算，也不推薦買賣。
- **產生方式與風險屬性解析相同**：送出分析後報告在背景產生，狀態分為產生中、完成、失敗；失敗時可以按「重新產生」（每人每分鐘 1 次）。
- **給一般投資人看得懂**：報告不出現內部的分類名稱，畫面上沒有的專業指標（例如 R²、偏態）改用白話描述；與大盤比較一律用「比大盤起伏大／划算」這類說法。後端會自動檢查 AI 的文字，不合格就請 AI 重寫。
- **歷史清單**：可以查看自己全部（或某個投資組合）的歷次分析，每筆附報告狀態與主要風險特徵。
- **欄位名稱統一**：分析相關的 API 欄位名稱改成與資料庫、Prompt 相同的寫法（snake_case）。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `spec/prompts/risk_analysis_system.md`、`risk_analysis_user.md`、`risk_analysis_retry.md` | 新增 | 風險分析報告的 AI 指令：怎麼閱讀分析資料、每個指標代表什麼、報告要寫哪些段落與不能寫什麼；以及 AI 寫錯時的重試提示。 |
| `backend/app/prompts/risk_analysis_*.txt` | 新增 | 上面三份指令的執行期純文字版（內容與規格檔逐字相同）。 |
| `spec/prompts/02_portfolio_system_prompt.md`、`03_user_prompt_template.md` | 刪除 | 舊版六段報告的草稿，已由新版取代。 |
| `backend/app/services/analysis_ai.py` | 新增 | 產生分析報告：整理要給 AI 的資料、呼叫 AI、檢查 AI 的內容、失敗重試，以及報告狀態（產生中／完成／失敗）的管理。 |
| `backend/app/routers/analysis.py` | 修改 | 風險分析的 API：執行分析後在背景產生報告，新增查詢報告、重新產生報告與歷史清單。 |
| `backend/app/services/analysis.py` | 修改 | 風險分析流程：歷史清單改為可看全部組合，並附組合名稱、報告狀態與主要風險特徵。 |
| `backend/app/services/risk_metrics.py` | 修改 | 風險指標計算：欄位名稱統一，規則報告與大盤比較改用「比…高／低」句型。 |
| `backend/app/models.py` | 修改 | 新增「分析報告」資料表（一次分析一份報告）。 |
| `backend/app/services/profile_ai.py` | 修改 | 風險屬性解析：開放重試次數與逾時設定給分析報告共用。 |
| `frontend/src/pages/RiskAnalysis.tsx` | 修改 | 風險分析頁：配合 API 欄位名稱的改動。 |
| `tests/test_analysis_ai.py` | 新增 | 分析報告的自動測試（資料整理、內容檢查、重試）。 |
| `tests/test_risk_metrics.py` | 修改 | 配合欄位名稱與句型的改動。 |
| `SPEC.md`、`spec/*` | 修改 | 規格書 v1.12.0（決策 D-135～D-143）。 |
| `README.md`、`changelog/028`、`changelog/README.md` | 修改／新增 | 說明文件更新；補上 PR #18 的版本說明。 |

## 技術備註

- 新的 `analysis_reports` 資料表由後端啟動時自動建立，不需要手動執行 SQL。
- 功能上線前建立的舊分析沒有報告，第一次查詢報告時才會產生。
- 分析 API 欄位名稱改為 snake_case 屬於破壞性變更，前端風險分析頁已同步修改。
