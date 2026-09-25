# 版本變更說明（changelog）

這個資料夾記錄 `main` 分支**每一個版本（commit）**改了哪些檔案、這些檔案是做什麼用的，
讓工程與非工程的成員都能快速看懂專案是怎麼一步步長出來的。

## 怎麼讀

- 想知道「專案某個時間點改了什麼」→ 從下方索引點進對應版本的檔案。
- 每份說明的結構固定：**一句話總結 → 白話說明 → 變更檔案表（含檔案功能）→ 技術備註**。
- 「白話說明」給非工程成員看；「技術備註」給工程成員看，不懂可以跳過。
- 表格的「異動」欄：`新增` = 這版才出現的檔案、`修改` = 原本就有、這版有改動。

## 版本索引（由舊到新）

| 編號 | 日期       | Commit    | 標題                            | 說明檔                                                                         |
| ---- | ---------- | --------- | ------------------------------- | ------------------------------------------------------------------------------ |
| 001  | 2026-09-18 | `c23ab9a` | Initial commit：專案骨架        | [001-c23ab9a-initial-commit.md](001-c23ab9a-initial-commit.md)                 |
| 002  | 2026-09-18 | `af73091` | 銀行利率服務與 n8n 工作流程匯出 | [002-af73091-bank-rates-and-n8n-workflows.md](002-af73091-bank-rates-and-n8n-workflows.md) |
| 003  | 2026-09-19 | `6bd8545` | 登入／註冊系統                  | [003-6bd8545-login-registration.md](003-6bd8545-login-registration.md)         |
| 004  | 2026-09-20 | `b16f3ec` | 合併 PR #1（登入／註冊）        | [004-b16f3ec-merge-pr1.md](004-b16f3ec-merge-pr1.md)                           |
| 005  | 2026-09-20 | `dd1e038` | 加入中文註解與 API 摘要         | [005-dd1e038-chinese-comments.md](005-dd1e038-chinese-comments.md)             |
| 006  | 2026-09-20 | `bd745af` | 合併 PR #2（中文註解）          | [006-bd745af-merge-pr2.md](006-bd745af-merge-pr2.md)                           |
| 007  | 2026-09-20 | `ba6dcbe` | 版本變更說明與 CLAUDE.md        | [007-ba6dcbe-changelog-and-claude-md.md](007-ba6dcbe-changelog-and-claude-md.md) |
| 008  | 2026-09-20 | `baee1b3` | 合併 PR #3（變更說明與規範）    | [008-baee1b3-merge-pr3.md](008-baee1b3-merge-pr3.md)                           |
| 009  | 2026-09-20 | `8533aaf` | n8n 金鑰驗證與時區              | [009-8533aaf-n8n-api-key.md](009-8533aaf-n8n-api-key.md)                       |
| 010  | 2026-09-20 | `6820e7e` | 合併 PR #4（n8n 金鑰驗證）      | [010-6820e7e-merge-pr4.md](010-6820e7e-merge-pr4.md)                           |
| 011  | 2026-09-20 | `594b829` | API 文件分類改中文              | [011-594b829-chinese-api-tags.md](011-594b829-chinese-api-tags.md)             |
| 012  | 2026-09-20 | `3afad85` | 合併 PR #5（API 文件分類）      | [012-3afad85-merge-pr5.md](012-3afad85-merge-pr5.md)                           |
| 013  | 2026-09-20 | `5061aa0` | 銀行利率存入資料庫              | [013-5061aa0-save-bank-rates.md](013-5061aa0-save-bank-rates.md)               |
| 014  | 2026-09-20 | `77b052d` | 合併 PR #6（銀行利率存入資料庫） | [014-77b052d-merge-pr6.md](014-77b052d-merge-pr6.md)                           |
| 015  | 2026-09-20 | `d378262` | 系統規格書與設計文件            | [015-d378262-spec-and-design.md](015-d378262-spec-and-design.md)               |
| 016  | 2026-09-20 | `21de53c` | 合併 PR #7（規格書與設計文件）  | [016-21de53c-merge-pr7.md](016-21de53c-merge-pr7.md)                           |
| 017  | 2026-09-21 | `b52312d` | 股票資料與每日股價抓取          | [017-b52312d-stock-data-fetch.md](017-b52312d-stock-data-fetch.md)             |
| 018  | 2026-09-21 | `0cd23eb` | 風險評估問卷與風險屬性          | [018-0cd23eb-questionnaire-risk-profile.md](018-0cd23eb-questionnaire-risk-profile.md) |
| 019  | 2026-09-21 | `3bc1b5d` | 投資組合首頁、買進紀錄與組合詳情頁 | [019-3bc1b5d-portfolio-home.md](019-3bc1b5d-portfolio-home.md)                 |
| 020  | 2026-09-24 | `7cf2bb8` | 資料表欄位改名與股價永久保存    | [020-7cf2bb8-schema-and-price-history.md](020-7cf2bb8-schema-and-price-history.md) |
| 021  | 2026-09-25 | `55a4283` | 液態玻璃介面改版與投資組合總覽  | [021-55a4283-liquid-glass-ui.md](021-55a4283-liquid-glass-ui.md)               |
| 022  | 2026-09-25 | `7487fff` | n8n 失敗訊息顯示卡在哪一步      | [022-7487fff-n8n-failure-message.md](022-7487fff-n8n-failure-message.md)       |

## 維護規則

- 檔名格式：`<三位數編號>-<短 hash>-<英文短標題>.md`，編號依 main 上的先後遞增。
- 「合併 PR」的版本本身沒有新內容，說明檔只需指向它合併進來的 commit。
- 每次有新版本進到 `main`，就在這裡新增一份說明並更新上方索引（規則同時寫在專案根目錄 `CLAUDE.md`）。
- 說明檔記錄的是**已經在 main 上的 commit**，因此會在下一個 PR 中補上，不會出現「commit 自己引用自己的 hash」的問題。
