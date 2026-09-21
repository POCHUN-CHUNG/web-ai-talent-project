# 018 · 風險評估問卷與風險屬性

- **Commit**：`0cd23eb`（PR #9）　**日期**：2026-09-21　**作者**：POCHUN-CHUNG
- **一句話總結**：新增 14 題風險評估問卷與「風險屬性」結果頁，並由 AI 產生一段客製化的風險屬性描述。

## 白話說明

登入後若還沒填過問卷（或上次作答有前後矛盾），系統會先導向問卷頁。填完 14 題後，後端依固定規則算出四項核心風險指標，AI 再寫一段白話描述；AI 失敗時指標仍會顯示，並提供「重新產生」。每次重填都會留下新的快照，舊的保留。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `backend/app/services/questionnaire.py` | 新增 | 14 題題庫、作答驗證，以及把作答轉成四項核心指標與交叉分析的固定規則。 |
| `backend/app/services/profile_ai.py` | 新增 | 呼叫 AI 產生風險屬性描述、檢查輸出格式、失敗時重試與降級。 |
| `backend/app/routers/questionnaire.py` | 新增 | 取得題目、送出作答、查詢風險屬性、重新產生描述（需登入，含送出頻率限制）。 |
| `backend/app/errors.py` | 新增 | 給前端的統一錯誤格式（錯誤碼、中文訊息、追蹤編號）。 |
| `backend/app/models.py` | 修改 | 新增問卷作答與風險屬性兩張資料表（唯讀快照）。 |
| `frontend/src/pages/Questionnaire.tsx`、`RiskProfile.tsx` | 新增 | 問卷填寫頁與風險屬性結果頁。 |
| `frontend/src/components/CooldownModal.tsx`、`LoadingOverlay.tsx` | 新增 | 「請稍後再填」提示視窗與「分析中」遮罩。 |
| `frontend/src/auth.tsx`、`App.tsx` | 修改 | 加入「尚未完成問卷就擋住其他頁面」的守衛。 |
| `tests/test_questionnaire.py` | 新增 | 問卷規則與 AI 輸出驗證的自動化測試。 |
| `README.md`、`SPEC.md`、`spec/*`、`.env.example`、`docker-compose.yml` | 修改 | 補充問卷說明、規格與 AI 相關環境變數。 |

## 技術備註

- 需要環境變數 `GEMINI_API_KEY`；未設定時後端照常啟動，描述顯示「暫時無法產生」。
