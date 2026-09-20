# 007 · 版本變更說明與 CLAUDE.md

- **Commit**：`ba6dcbe`　**日期**：2026-09-20　**作者**：POCHUN-CHUNG
- **一句話總結**：新增「每個 main 版本的變更說明」資料夾，以及給 AI 助理與團隊遵循的開發規範檔。**沒有改變任何程式功能。**

## 白話說明

讓每位成員（含非工程）都能查到「每個版本改了哪些檔案、各檔案做什麼」。同時把團隊約定寫成規範：在 worktree 怎麼安全地測試、commit 不加 AI 署名、程式註解怎麼寫、README 何時要更新。

## 變更檔案

| 檔案 | 異動 | 功能 |
| ---- | ---- | ---- |
| `changelog/README.md` | 新增 | 版本變更說明的索引與維護規則。 |
| `changelog/001` ～ `006` 共 6 份 | 新增 | 專案第一版到 PR #2 合併為止，各版本的變更說明。 |
| `CLAUDE.md` | 新增 | 開發規範：worktree 測試用 `docker-compose-test.yml`、commit／PR 不加署名、註解規範、changelog 與 README 維護規則。 |
| `README.md` | 修改 | 資料夾結構加入 `CLAUDE.md` 與 `changelog/`。 |
