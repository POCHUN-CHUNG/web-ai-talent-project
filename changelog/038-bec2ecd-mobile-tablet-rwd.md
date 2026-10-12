# 038 · 手機與平板 RWD 版面調整

- **Commit**：`bec2ecd`（PR #27）　**日期**：2026-10-13　**作者**：POCHUN-CHUNG
- **一句話總結**：依 iPhone、iPad 實機測試調整手機與平板的版面（導覽列、霧面、Safari 底部、平板頂端列等），並新增讓手機用區網連線開發環境的設定；電腦版行為不變、後端未修改。

## 白話說明

- **手機**
  - 點輸入框時整頁不再自動放大（輸入框字級維持 16px）。
  - 內容少的頁面不再多出捲動，版權聲明位置正確（頁面高度改用「目前實際可視高度」）。
  - 底部懸浮導覽列與內容同寬、往下貼近畫面底部；頂端列與導覽列下方有霧面效果。
  - **Safari**：導覽列下方到畫面最底改成不透明底色，Safari 底部網址列後方不再透出網頁內容。
  - **Chrome**：工具列收起時，導覽列貼近畫面底部，下方不留空白。
  - 「新增買進紀錄」的標的輸入框，聚焦時只顯示一條框線。
- **平板**
  - 直放時導覽列和手機一樣在下方，橫放時維持電腦版的頂端導覽列。
  - 頂端列不再跟著內容被捲走。
  - 投資組合的四張配置圖排成 2×2；卡片較窄時改成上圖下清單，產業別與個股別的圖表與清單上下對齊。
- **全尺寸**
  - 問卷：題號對齊題目第一行、題目與選項間距、底部留白與其他頁一致。
  - 環形圖中間的「共 N 檔」垂直置中。
  - 庫存明細表格左右留邊，滑過時的灰底不超出卡片。
  - 風險分析「一年內提款可能性」的題目文字縮短為「1 年內提領這筆資金的機率」，平板不換行。
- **開發環境**：新增 `PUBLIC_HOST` 環境變數，設成電腦的區網 IP，就能用手機以區網連線測試。
- 同時補上 PR #23～#26 的版本說明（034～037）。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `frontend/index.html` | 修改 | 網頁的外框檔：viewport 加上 `viewport-fit=cover`（Chrome 導覽列貼底）；新增一小段辨識 iPhone／iPad Safari 的腳本，讓 Safari 專用的樣式能單獨套用。 |
| `frontend/src/styles/tokens.css` | 修改 | 全站設計參數：手機輸入框字級 16px；手機與平板直放的導覽列距底距離、預留高度。 |
| `frontend/src/styles/global.css` | 修改 | 全站基礎樣式：頁面高度改用動態可視高度；禁止整頁左右捲動（修正平板頂端列被捲走）。 |
| `frontend/src/components/layout/TopBar.module.css` | 修改 | 頂端列與導覽列：手機／平板直放的底部導覽列、霧面、與內容同寬；狀態列高度留白。 |
| `frontend/src/components/layout/TabsLayout.tsx`、`TabsLayout.module.css` | 修改 | 分頁共用外框：導覽列下方的霧面與 Safari 專用的不透明底色列。 |
| `frontend/src/components/layout/EntryPage.module.css` | 修改 | 登入／註冊頁外框：頁面高度與底部安全區留白。 |
| `frontend/src/components/LotForm.module.css` | 修改 | 新增買進紀錄表單：標的輸入框聚焦時只有一條框線。 |
| `frontend/src/components/PortfolioCharts.tsx`、`PortfolioCharts.module.css` | 修改 | 投資組合圖表：環形圖中間文字置中；平板窄卡片改上圖下清單；產業別與個股別對齊。 |
| `frontend/src/pages/PortfolioDetail.module.css` | 修改 | 投資組合細節頁：配置圖平板 2×2、庫存明細左右留邊。 |
| `frontend/src/pages/Questionnaire.module.css` | 修改 | 問卷頁：題號對齊、題目與選項間距、底部留白。 |
| `frontend/src/pages/RiskAnalysis.tsx` | 修改 | 風險分析頁：「一年內提款可能性」題目文字縮短。 |
| `docker-compose.yml` | 修改 | 開發環境設定：前端呼叫後端的網址、後端允許的前端來源改由 `PUBLIC_HOST` 組成。 |
| `.env.example`、`README.md` | 修改 | 新增 `PUBLIC_HOST` 的說明。 |
| `DESIGN.md` | 修改 | 設計規範：同步手機／平板導覽列、霧面、Safari 底部列、viewport 等規則。 |
| `changelog/034`～`037`、`changelog/README.md` | 新增／修改 | 補上 PR #23～#26 的版本說明與索引。 |

## 技術備註

- Safari 底部網址列後方的顏色無法由網頁直接畫上去；做法是放一個「貼齊畫面最底、全寬、不透明、可接收點擊」的真正元素，Safari 會把它的顏色延伸到網址列後方（偽元素或 `pointer-events: none` 會被略過）。
- 正式環境只需重建前端；`PUBLIC_HOST` 只用於開發環境的 `docker-compose.yml`。
