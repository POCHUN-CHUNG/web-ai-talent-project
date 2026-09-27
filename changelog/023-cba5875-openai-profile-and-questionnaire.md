# 023 · 風險屬性解析改用 OpenAI、問卷改版與作答衝突強化

- **Commit**：`cba5875`（PR #14）　**日期**：2026-09-25　**作者**：POCHUN-CHUNG
- **一句話總結**：風險屬性的 AI 解析改用 OpenAI 產生四段白話說明，問卷改成單欄玻璃卡設計並加強「前後作答矛盾」的檢查，未完成評估時擋住其他功能頁。

## 白話說明

- **新使用者的流程**：登入後先停在「風險屬性」頁，引導使用者開始評估；還沒完成評估就直接打網址進其他功能頁，會被導回並跳出提示視窗。另外先建立了「風險分析」「歷史紀錄」兩個空頁面，同樣需要完成評估才能進入。
- **AI 解析**：從 Gemini 改用 OpenAI，產生四段有標題的白話說明（以「您」稱呼），五項交叉分析都會說明；核心立場是避免虧損、不建議提高風險。
- **作答矛盾**：前後回答互相矛盾（例如第 10 與第 11 題、第 3 與第 9 題）時不會存檔，問卷頁會把有問題的題目標紅框，並用提示視窗說明是哪幾題，改完自動捲到另一題。
- **問卷與分析畫面**：問卷改為單欄玻璃卡；分析中改為標題＋轉圈圈＋外框漸層閃爍，解析失敗時才顯示「重新產生」。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `.env.example`、`docker-compose.yml` | 修改 | 環境變數範本與服務設定，AI 金鑰改為 OpenAI 相關變數。 |
| `backend/app/prompts/risk_profile_system.txt`、`risk_profile_user.txt` | 新增 | 交給 AI 的指示（Prompt）：規定解析的語氣、四段結構與必須涵蓋的交叉分析。 |
| `backend/app/prompts/01_profile_system.txt`、`01_profile_user.txt` | 刪除 | 舊版 Gemini 用的 Prompt。 |
| `backend/app/services/profile_ai.py` | 修改 | 呼叫 AI 產生風險屬性解析的程式，改用 OpenAI。 |
| `backend/app/services/questionnaire.py` | 修改 | 問卷計分與作答矛盾檢查，整理成 AI 需要的資料格式。 |
| `backend/app/routers/questionnaire.py` | 修改 | 問卷送出的 API，作答矛盾時回報錯誤且不存檔。 |
| `backend/app/models.py`、`backend/app/errors.py`、`backend/requirements.txt` | 修改 | 資料表欄位、錯誤訊息格式與套件清單配合新流程調整。 |
| `frontend/src/App.tsx`、`auth.tsx`、`api.ts` | 修改 | 頁面路由與登入狀態：未完成評估時擋住功能頁。 |
| `frontend/src/components/RiskProfileGateModal.*` | 新增 | 未完成評估時跳出的提示視窗。 |
| `frontend/src/components/ui/AlertDialog.*` | 新增 | 通用的提示視窗（問卷作答矛盾時使用）。 |
| `frontend/src/components/AnalyzingGlow.*` | 新增 | 分析中的外框漸層閃爍效果。 |
| `frontend/src/components/LoadingOverlay.tsx` | 刪除 | 舊版的全畫面載入遮罩。 |
| `frontend/src/pages/Questionnaire.*` | 修改 | 問卷頁：單欄玻璃卡、矛盾題標示與自動捲動。 |
| `frontend/src/pages/RiskProfile.*` | 修改 | 風險屬性頁：開始評估的引導、分析中與失敗時的畫面。 |
| `frontend/src/pages/RiskAnalysis.*`、`History.*` | 新增 | 風險分析、歷史紀錄兩個先建立的空頁面。 |
| `frontend/src/components/CooldownModal.tsx`、`layout/TopBar.tsx`、`ui/Input.tsx`、`ui/Modal.module.css`、`pages/Login.tsx`、`pages/Portfolios.tsx` | 修改 | 配合新流程的小幅調整（提示視窗、導覽列、輸入框等）。 |
| `SPEC.md`、`spec/**` | 修改／新增 | 規格文件同步更新（新 Prompt、作答矛盾規則、常數與測試資料）。 |
| `tests/test_questionnaire.py` | 修改 | 問卷計分與作答矛盾的自動測試。 |
| `DESIGN.md`、`README.md` | 修改 | 設計系統與專案說明同步更新。 |
| `changelog/020～022`、`changelog/README.md` | 新增／修改 | 補上 PR #11～#13 的版本說明。 |

## 技術備註

- OpenAI 使用 Responses API、Structured Outputs 與 prompt caching；環境變數改為 `OPENAI_*`。
- 作答矛盾回 422 且不寫入資料庫；facts／findings 直接存成 Prompt 需要的格式，移除 readiness、issues、priority、statement 欄位。
