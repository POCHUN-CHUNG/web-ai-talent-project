# 01 · AI 預設決策清單（P-xx）

> 柏鈞於 2026-09-20 授權：檔名、API 路由、資料表欄位、環境變數等技術參數由我以業界標準訂定，需要改既有程式就改。
> 本清單的每一項都會原樣寫入 `SPEC.md` 與 `spec/` 各層文件；**這些是「已決定但待你覆核」的項目**，不是提問。
> 覆核方式：掃過一遍，只回報你要改的編號即可。
> 版本：0.1.0 ｜ 日期：2026-09-20

---

## 〇、命名總則（→ SPEC §0.4）

### P-45 時間欄位

| 語意 | 欄位名 | 用在哪些表 |
| --- | --- | --- |
| 最後更新時間 | **`updated`** | `stock_info`、`bank_rates`、`holding_lots`、`portfolios` |
| 建立時間（寫入後永不改變） | **`created`** | `users`、`portfolios`、`holding_lots`、`questionnaire_answers`、`risk_profiles`、`analysis_results`、`analysis_reports` |
| 業務日期（非時間戳） | 各自具名，例 `trade_date`、`rate_as_of` | — |

唯讀快照表（`questionnaire_answers`、`risk_profiles`、`analysis_results`、`analysis_reports`）**不設 `updated`**，因為它們一旦寫入就不可修改（P-08），有這個欄位反而暗示可以改。

**既有程式需配合修改**：`backend/app/models.py` 的 `User.created_at` → `created`。
`bank_rates.updated` 已符合本規則，不需修改。
`daily_quotes` **不設 `updated`**（D-50）：該表只有寫入與覆寫兩種操作，`trade_date` 已足以定位每一列，多一個時間欄位對查詢與除錯都沒有貢獻。

### P-46 命名以「看名字就懂」為準

資料表、欄位、API 路徑、檔名一律選最直白的說法，不用行話、不用縮寫、不用英文複數變形容易搞混的字。

| 原本名稱 | 改為 | 理由 |
| --- | --- | --- |
| `instruments` | **`stock_info`** | 「標的」不如「股票基本資料」直白 |
| `holding_lots` | **`holding_lots`** | `lot` 是交易行話。每一列就是一筆「買進」 |
| `questionnaire_submissions` | **`questionnaire_answers`** | 「作答」比「提交紀錄」好懂 |
| `analyses` | **`analysis_results`** | `analyses` 與 `analysis` 拼寫容易搞錯；加 `_results` 也說明了裡面存什麼 |
| `created_at` | **`created`** | 與 `updated` 對稱 |
| API 路徑 `/analyses/...` | **`/analysis/...`** | 路徑一律用單數 `analysis`，避開拼寫陷阱 |
| 前端 `Landing.tsx` | **`Login.tsx`** | 這頁做的是登入與註冊，不是 landing page |

最終資料表共 10 張：`users`、`stock_info`、`daily_quotes`、`bank_rates`、`questionnaire_answers`、`risk_profiles`、`portfolios`、`holding_lots`、`analysis_results`、`analysis_reports`。

## 一、命名與語言慣例（→ SPEC §0.4）

| 項目 | 慣例 | 備註 |
| --- | --- | --- |
| Python 變數／函式 | `snake_case` | 沿用現況 |
| Python 類別 | `PascalCase` | 沿用現況 |
| Python 檔名 | `snake_case.py` | 沿用現況 |
| TypeScript 變數／函式 | `camelCase` | 沿用現況 |
| React 元件與其檔名 | `PascalCase.tsx` | 沿用現況 |
| 非元件 TS 檔名 | `camelCase.ts` | 現況 `api.ts`、`auth.tsx` 相容 |
| 常數 | `SCREAMING_SNAKE_CASE` | |
| 資料表與欄位 | `snake_case`；表名以複數為原則，但直白優先（`stock_info` 不改為 `stock_infos`） | |
| API 路徑 | `kebab-case`，資源用複數名詞 | |
| 分支名稱 | `<type>/<slug>` | 沿用現況（`feat/`、`fix/`、`docs/`） |
| Commit 訊息 | Conventional Commits | 沿用 `CLAUDE.md` §2：不得加 AI 署名 |
| 程式碼註解 | 繁體中文，格式依 `CLAUDE.md` §3 | |
| 文件正文 | 繁體中文（台灣） | |
| UI 文案 | 繁體中文（台灣），不做多語系 | 多語系列入非目標 |

## 二、API 契約（→ SPEC §3.3）

### P-01 版本前綴：不使用（2026-09-20 修訂）

**沿用現況，不加 `/api/v1`**，直接以功能名稱作為路徑第一段（`/auth/*`、`/bank-rates/*`）。既有兩支 router 不需遷移。
取捨：日後若要做破壞性改版，無法用路徑版本並行，只能以「新端點 + 舊端點標記棄用」處理。本專案為單一前端單一後端、無外部 API 消費者，此限制可接受。

### P-02 HTTP 方法：採完整 REST

`main.py` 的 `allow_methods` 由 `["GET","POST"]` 改為 `["GET","POST","PATCH","DELETE","OPTIONS"]`；`frontend/src/api.ts` 改為接受明確 method 參數。（原 Q-08 由此結案，採標準 REST。）

### P-03 端點清單（2026-09-20 修訂：移除版本前綴、持股改為交易明細）

| 方法 | 路徑 | 用途 | 存取控制 |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | 註冊並自動登入 | 公開，需限流 |
| `POST` | `/auth/login` | 登入 | 公開，需限流 |
| `POST` | `/auth/logout` | 登出 | Cookie |
| `GET` | `/auth/me` | 查詢登入者 | Cookie |
| `POST` | `/auth/change-password` | 修改密碼 | Cookie |
| `GET` | `/questionnaire` | 取得 14 題題目與選項 | Cookie |
| `POST` | `/questionnaire/answers` | 送出作答，建立風險屬性快照 | Cookie |
| `GET` | `/risk-profiles/latest` | 取得目前生效的風險屬性 | Cookie |
| `GET` | `/risk-profiles/{profile_id}` | 取得指定版本 | Cookie |
| `GET` | `/portfolios` | 投資組合清單 | Cookie |
| `POST` | `/portfolios` | 新增投資組合 | Cookie |
| `GET` | `/portfolios/{portfolio_id}` | 單一組合，含彙總部位與買進紀錄 | Cookie |
| `PATCH` | `/portfolios/{portfolio_id}` | 改名稱 | Cookie |
| `DELETE` | `/portfolios/{portfolio_id}` | 刪除組合 | Cookie |
| `POST` | `/portfolios/{portfolio_id}/holding-lots` | 新增一筆買進紀錄 | Cookie |
| `PATCH` | `/portfolios/{portfolio_id}/holding-lots/{lot_id}` | 修改該筆的日期／股數／單價 | Cookie |
| `DELETE` | `/portfolios/{portfolio_id}/holding-lots/{lot_id}` | 刪除該筆買進紀錄 | Cookie |
| `POST` | `/portfolios/{portfolio_id}/analysis` | 執行一次量化分析 | Cookie |
| `GET` | `/portfolios/{portfolio_id}/analysis/history` | 該組合的歷史分析清單 | Cookie |
| `GET` | `/analysis/{analysis_id}` | 取得量化結果與圖表資料 | Cookie |
| `GET` | `/analysis/{analysis_id}/report` | 取得 AI 解說報告 | Cookie |
| `POST` | `/analysis/{analysis_id}/report/retry` | AI 失敗後重試產生報告 | Cookie |
| `GET` | `/stocks?q=` | 股票代號／名稱查詢 | Cookie |
| `GET` | `/bank-rates/latest` | 最新一批五家銀行利率 | Cookie |
| `POST` | `/bank-rates/fetch` | 抓取並寫入利率（現況既有端點，路徑不變） | `X-API-Key` |
| `POST` | `/stocks/fetch` | 抓取並寫入股票基本資料（後端自行抓取，D-56） | `X-API-Key` |
| `POST` | `/market-data/fetch` | 抓取並寫入個股與大盤日收盤價，成功後清理過期資料（後端自行抓取，D-56） | `X-API-Key` |
| `GET` | `/health` | 健康檢查 | **僅限容器內部**（來源須為 127.0.0.1／::1） |

### P-03b `/health` 的存取限制（D-51）

`/health` **不對外公開**，使用者與 n8n 皆不得存取。實作方式：檢查請求來源位址，非 `127.0.0.1` 或 `::1` 一律回 **404**（不是 403——403 等於承認這個端點存在）。

Docker healthcheck 在容器內以 `curl -fsS http://127.0.0.1:8000/health` 呼叫，來源即為 `127.0.0.1`，可通過。
瀏覽器經發布埠進來的請求，來源是 Docker 橋接網路的閘道位址；n8n 在同一容器網路，來源是它自己的容器 IP——兩者都不是回送位址，因此都會拿到 404。

此端點**不限流、不寫日誌**（每數秒一次的健康檢查會把日誌灌爆）。

僅供 n8n 呼叫的端點不另設 `/internal` 分段，改以 `dependencies=[Depends(require_n8n_key)]` 與 `summary` 標註呼叫對象辨別（沿用現況 `/bank-rates/fetch` 的做法，符合 `CLAUDE.md` §6）。

### P-04 全域慣例

端點依呼叫對象分成兩套回應慣例，**不混用**：

| 呼叫對象 | 成功回應 | 失敗回應 |
| --- | --- | --- |
| 前端（Cookie 驗證） | 資源本身的 JSON | `{"detail": {"code": "SNAKE_CASE_CODE", "message": "中文訊息", "trace_id": "uuid"}}` |
| n8n（`X-API-Key`） | `{"message", "status": "成功", "success_count", "fail_count", ...資料}` | 同一層：`{"message", "status": "失敗", "success_count", "fail_count", "error", ...}`（不包 `detail`，D-59） |

n8n 的格式定義於 `services/n8n_result.py`，符合 `CLAUDE.md` §8：只回執行狀態、成敗筆數與資料本身，**不含時間**，成功與失敗欄位同一層，方便 n8n 以同一組運算式處理。
前端的格式需要 `code` 供程式分支、`trace_id` 供對照日誌，兩者缺一不可。

| 項目 | 規範 |
| --- | --- |
| 分頁 | `?page=1&page_size=20`，回應含 `{"items": [], "page", "page_size", "total"}`；`page_size` 上限 100 |
| 排序 | `?sort=field` 升冪、`?sort=-field` 降冪 |
| 日期 | 輸入輸出皆 ISO 8601；含時刻者一律 UTC 並帶 `Z`；純日期用 `YYYY-MM-DD` |
| 認證 | 前端一律 Cookie（`session_id`, HttpOnly, SameSite=Lax）；n8n 一律 `X-API-Key` |
| 冪等 | `POST /market-data/fetch` 以 `(symbol, trade_date)` 覆寫，重跑不產生重複列 |
| 限流 | 登入／註冊每 IP 每分鐘 10 次；分析每使用者每分鐘 3 次 |

## 三、資料表（→ SPEC §3.2）

### P-05 表清單

`users`、`stock_info`、`daily_quotes`、`bank_rates`、`questionnaire_answers`、`risk_profiles`、`portfolios`、`holding_lots`、`analysis_results`、`analysis_reports`。共 10 張。

「持股部位」不落表，由 `holding_lots` 依 `symbol` 即時彙總。個股與指數報價共用 `daily_quotes`（P-06）。

### P-06 `daily_quotes`（個股與指數共用，2026-09-20 二次修訂）

**只保留收盤價。** 開盤價、最高價、最低價、成交量經確認**不被任何指標、任何圖表使用**，全部不存。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `BIGSERIAL PK` | |
| `symbol` | `VARCHAR(10) NOT NULL REFERENCES stock_info(symbol) ON DELETE RESTRICT` | **純代號，不含市場後綴**：`2330`、`0050`、`00878`；市場基準為 `IR0001` |
| `adj_close` | `NUMERIC(14,4) NOT NULL CHECK (adj_close > 0)` | **一律為含息基準**：個股存 yfinance 的 `Adj Close`（已還原除權息），指數存報酬指數收盤值 |
| `trade_date` | `DATE NOT NULL` | 交易日（台北時區的日期） |

`UNIQUE (symbol, trade_date)`；索引 `(symbol, trade_date DESC)`。**三個資料欄位，無 `source`、無 `asset_type`、無 `updated`。**

**為什麼不設 `updated`**（D-50）：這張表只有兩種操作——寫入新交易日、覆寫同一交易日的值。`trade_date` 已足以定位每一列，再記一個寫入時間對查詢、除錯與稽核都沒有貢獻，只是每列多 8 bytes 與一個可能忘記更新的欄位。

**為什麼不需要 `asset_type`**：市場基準由 `MARKET_BENCHMARK_SYMBOL` 指定為 `IR0001`，其餘代號皆為股票或 ETF。需要分辨時查 `stock_info.market`（值為 `指數` 者即為基準）。多一個欄位只會多一個可能寫錯的地方。

**欄位命名的約束意義**：叫 `adj_close` 而非 `close`，是為了讓「這一欄永遠是還原權息後的值」寫在名字裡。**嚴禁**寫入未還原的原始收盤價——那不會報錯，只會讓長期報酬與 Beta 靜默失真。報酬指數本身即為還原除權息後的指數，與個股 `Adj Close` 同基準，因此共用此欄名在語意上成立。

**寫入內容範例（個股與指數同格式，由後端抓取後直接寫入，不經 API 傳入）**

| `symbol` | `adj_close` | `trade_date` |
| --- | --- | --- |
| `2330` | `1190.0000` | `2026-09-19` |
| `2330` | `1185.0000` | `2026-09-18` |
| `IR0001` | `14790.7400` | `2016-09-01` |

同一 `(symbol, trade_date)` 已有資料時**直接覆寫** `adj_close`。`market_index_prices` 表與 `/market-data/index-prices` 端點**取消**。

### P-06c `stock_info`（股票基本資料）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `symbol` | `VARCHAR(10) PRIMARY KEY` | 有價證券代號，純代號不含後綴 |
| `name` | `VARCHAR(40) NOT NULL` | 有價證券名稱 |
| `market` | `VARCHAR(20) NOT NULL` | 市場別：`上市`、`上櫃`、`指數` |
| `industry` | `VARCHAR(40) NOT NULL` | 產業別；ETF 與指數亦有值（例 `大盤`） |
| `updated` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | 最後更新時間 |

以 `symbol` 為自然主鍵，不另設流水號。索引：`(name)` 供搜尋使用（FR-21）。

**資料來源**：證交所 ISIN 分類表 `https://isin.twse.com.tw/isin/class_main.jsp?market={m}&issuetype={i}`，四個組合涵蓋上市普通股（含 KY）、上櫃普通股、上市 ETF、上櫃 ETF。由後端 `services/stock_info.py` 抓取（D-56）。

**代號白名單**：後端抓取時以 `^([1-9]\d{3}|00\d{2,3}[A-Za-z]?)$` 過濾，只留四位數普通股與 `00` 開頭的 ETF（含 `00981A` 這類帶字尾者）。後端寫入時以同一規則過濾，或代號等於 `MARKET_BENCHMARK_SYMBOL`，兩者皆不符即拒絕。

**`IR0001` 亦寫入本表**（`name` = `加權報酬指數`、`market` = `指數`、`industry` = `大盤`）。因此 `daily_quotes.symbol` 與 `holding_lots.symbol` 都能建立外鍵，代號體系完全統一。
但 `holding_lots.symbol` 另加 `CHECK`：不得為 `market = '指數'` 的代號——使用者不能把指數當持股輸入。此約束以應用層驗證實作（PostgreSQL 的 CHECK 無法跨表查詢）。

**與 yfinance 的代號轉換由後端抓取服務負責**：`market` 為「上市」時對應 `{symbol}.TW`，「上櫃」時對應 `{symbol}.TWO`。**資料庫內一律只存純代號**。

### P-06b IR0001 的來源端點特性

**來源**：`https://www.twse.com.tw/rwd/zh/TAIEX/MFI94U?response=json&date=YYYYMM01`（與舊路徑 `indicesReport/MFI94U` 回傳相同，實作採此路徑）

| 特性 | 說明 |
| --- | --- |
| 回傳粒度 | **一次一個月**，`total` 為該月交易日數（例：2016-09 為 19 日）。首次回補 10 年需呼叫約 120 次 |
| 日期格式 | 民國年，`"105/09/01"`。**轉換為西元 ISO 日期由後端抓取服務負責**（民國年 + 1911） |
| 數值格式 | 含千分位逗號，`"14,790.74"`。**去逗號轉數值由後端抓取服務負責** |
| 成功判定 | `stat == "OK"` 為成功；`stat` 含「沒有符合條件」為該月確實無資料（不算失敗）；其他一律視為失敗（被擋、出錯），**不可當成無資料**，否則資料庫會出現缺口 |

寫入內容與個股相同（見 P-06），由 `POST /market-data/fetch` 一併處理。

### P-07 `holding_lots` 的欄位與型別（買進紀錄）

依 D-16 與 D-22，同一檔股票可有多筆買進紀錄，每筆四個使用者輸入欄位：

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `BIGSERIAL PK` | |
| `portfolio_id` | `BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE` | |
| `symbol` | `VARCHAR(10) NOT NULL REFERENCES stock_info(symbol) ON DELETE RESTRICT` | 純代號，例 `2330`。不得為 `market = '指數'` 的代號 |
| `trade_date` | `DATE NOT NULL` | 買進日期，不得晚於今日 |
| `quantity` | `NUMERIC(18,4) NOT NULL CHECK (quantity > 0)` | 買進股數，支援零股 |
| `unit_cost` | `NUMERIC(12,4) NOT NULL CHECK (unit_cost > 0)` | 每股價格 |
| `created` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | 建立時間 |
| `updated` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | 最後修改時間 |

索引 `(portfolio_id, symbol, trade_date)`。**無 UNIQUE 限制**：同一檔、同一天可以有多筆（不同券商或分次成交）。

**不支援賣出紀錄**（D-24）。減碼由使用者直接修改或刪除該筆買進紀錄達成，因此系統不計算已實現損益。

**彙總規則（每次載入即時計算，不落表）**

| 衍生值 | 公式 |
| --- | --- |
| 部位股數 | $Q_i=\sum_k q_{ik}$ |
| 加權平均成本 | $\bar{c}_i=\dfrac{\sum_k q_{ik}c_{ik}}{\sum_k q_{ik}}$ |
| 投入成本 | $\text{cost}_i=\sum_k q_{ik}c_{ik}$ |
| 市值 | $V_i=Q_i\times\text{latest\_adj\_close}_i$ |
| 未實現損益 | $V_i-\text{cost}_i$ |
| 未實現報酬率 | $(V_i-\text{cost}_i)/\text{cost}_i$ |
| 該筆持有天數 | 今日 − `trade_date`（日曆日） |
| 部位持有天數 | 以投入成本加權的平均持有天數 |
| 年化持有報酬率 | $(1+\text{未實現報酬率})^{365/\text{持有天數}}-1$；持有天數 < 30 日時不計算，標示「持有期間過短」 |

畫面凡顯示損益處，固定附註「未納入手續費與交易稅」。
**刻意不採「整數最小單位」**：台股報價最小跳動單位隨價格分段變動（0.01／0.05／0.10／0.50／1.00 元），整數分制無法乾淨表達。全程使用 `NUMERIC`／Python `Decimal`，**任何金額與價格欄位禁止出現 `float`**。

### P-07b `bank_rates`（沿用現況，不修改）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `taiwan_bank` | `NUMERIC(5,3) NOT NULL` | 臺灣銀行 1 年期定存機動利率（%） |
| `tcb_bank` | `NUMERIC(5,3) NOT NULL` | 合作金庫 |
| `land_bank` | `NUMERIC(5,3) NOT NULL` | 土地銀行 |
| `huanan_bank` | `NUMERIC(5,3) NOT NULL` | 華南銀行 |
| `first_bank` | `NUMERIC(5,3) NOT NULL` | 第一銀行 |
| `updated` | `TIMESTAMPTZ PRIMARY KEY` | 最後更新時間（UTC） |

**永遠只有一列**：`POST /bank-rates/fetch` 先 `DELETE` 全表再 `INSERT` 一列，同一次交易內完成，任一步失敗即回滾。不保留歷史。

因此：
- $R_f$ 的取得是單列查詢，沒有「批次」概念，也不會出現「四家成功一家失敗」的殘缺狀態。
- **歷史利率無法回溯**。這是 D-08（$R_f$ 取最新一筆）成立的必要條件，也表示「$R_f$ 取分析期間歷史平均」這條路線已永久關閉。
- 分析快照必須自行記下當次採用的 `risk_free_rate` 與 `rate_as_of`（P-08），否則下次抓取後就再也查不到當時用的是哪個值。

新增第六家銀行需要 `ALTER TABLE`（寬表的代價）。五家公股銀行是固定集合，此代價可接受。

### P-08 快照策略

`risk_profiles` 與 `analysis_results` 皆為**唯讀快照**：一旦建立不可修改，重填問卷或重新分析都產生新列。`analysis_results` 內嵌當次採用的 `lookback_years`、`effective_start_date`、`effective_end_date`、`trading_days`、`risk_free_rate`、`rate_as_of`、`mar`、完整指標 JSON 與相關矩陣 JSON。

## 四、量化計算參數（→ SPEC §4.1）

| # | 項目 | 決策 |
| --- | --- | --- |
| P-09 | 交易日年化係數 | `252` |
| P-10 | 日報酬 | 簡單報酬 $R_t=(P_t-P_{t-1})/P_{t-1}$，價格取 `adj_close` |
| P-11 | 年化報酬 $R_p$ | 幾何年化：$(1+\text{累積報酬})^{252/n}-1$（不用日均 × 252） |
| P-12 | 波動度 | 樣本標準差 `ddof=1`，再 $\times\sqrt{252}$ |
| P-13 | $R_f$ 日化 | 複利：$R_{f,daily}=(1+R_f)^{1/252}-1$（不用 $R_f/252$） |
| P-14 | $R_f$ 取值 | `bank_rates` 唯一一列的五個欄位算術平均：$(taiwan+tcb+land+huanan+first)/5$。該表永遠只有一列，不需分組也不需排序。表為空時回 `RISK_FREE_RATE_UNAVAILABLE` |
| P-15 | ES95 分位數（原 G-07） | 線性內插（NumPy 預設 `method="linear"`，等同 R type 7）；$ES_{95}=-\text{mean}(R \le q_{0.05})$ |
| P-16 | Beta / R² | 以 OLS 含截距對市場日報酬迴歸；$R^2=\text{Corr}(R_p,R_m)^2$ |
| P-17 | 市場基準 | **`IR0001`**（臺灣證券交易所發行量加權股價**報酬**指數，TAIEX TRI，含息）。與個股採用的 `adj_close`（已還原除權息）基準一致，Beta 與 R² 的分子分母定義相同。抓取由後端 `services/market_data.py` 執行（D-56） |
| P-18 | 相關係數 | Pearson，成對皆有值才計算；缺值輸出 `null`，不得補 0 |
| P-19 | 權重 | 目前市值權重 $w_i=P_iQ_i/\sum P_jQ_j$，$Q_i$ 為該檔全部買進紀錄的股數加總，價格取最新交易日 `adj_close`。**買進日期不影響權重**：14 項風險指標一律為「固定目前權重的歷史模擬」，這是刻意設計，AI Prompt 已明文載明此口徑 |
| P-20 | 浮點比較容差（原 §5.6） | 相對誤差 $<10^{-6}$；黃金測試向量以此標準比對 |
| P-21 | 單一持股（原 G-06） | HHI=1、$N_{eff}$=1、Beta 與 R² 照算、相關矩陣為 1×1、熱圖 `status="unavailable"`；`diversification` 段照常輸出並說明原因 |
| P-22 | 組合上限（原 G-16） | 每使用者最多 20 個投資組合；每組合最多 50 檔**不同股票**；每檔最多 100 筆買進紀錄 |
| P-23 | 資料保留（原 G-09，2026-09-21 修訂，D-62） | `daily_quotes` 的保留期為 **`ANALYSIS_MAX_LOOKBACK_YEARS` 年 + `PRICE_RETENTION_BUFFER_DAYS` 天**（預設 10 年 + 31 天），由每日抓取（`POST /market-data/fetch`）**有抓到資料且全部成功後**自動清理，刪除 `trade_date` 早於「今天 − 保留期」的列（以日曆計算，閏年由日期函式處理，不以固定天數近似）。兩個變數啟動時驗證，不合法即無法啟動。個股與指數同規則。`bank_rates` **只保留當前一列，不留歷史**，不需清理 |
| P-24 | 快取（原 G-17） | Redis 快取 `analysis_results` 的量化結果與 AI 報告，鍵為 `analysis:{analysis_id}`，TTL 24 小時；問卷與買進紀錄不快取 |

## 五、指標識別碼（原 E-2，→ SPEC §3.1）

`metrics` 的 11 個純量值，識別碼固定為：

`annualized_volatility`、`annualized_downside_deviation`、`beta`、`r_squared`、`max_drawdown`、`expected_shortfall_95`、`skewness`、`excess_kurtosis`、`hhi`、`sharpe_ratio`、`sortino_ratio`。

風險貢獻度在 `holdings[].rc` / `holdings[].pcr`，相關矩陣在 `correlation`，有效持股檔數由前端以 $1/HHI$ 衍生，三者皆不計入這 11 項。

### P-25 `readiness` 列舉值統一（原 N-07）

問卷階段與分析階段一律使用 `ready` / `limited` / `blocked`。原問卷 Prompt 的 `needs_review` → `limited`、`insufficient` → `blocked`，`spec/prompts/01_profile_system_prompt.md` 需同步改寫。

## 六、環境變數（→ SPEC §2.6）

| 變數 | 型別 | 預設 | 機密 | 說明 |
| --- | --- | --- | --- | --- |
| `GEMINI_API_KEY` | string | — | 是 | Gemini API 金鑰 |
| `GEMINI_MODEL` | string | `gemini-3.5-flash` | 否 | 模型代號 |
| `GEMINI_TIMEOUT_SECONDS` | int | `180` | 否 | 單次呼叫逾時（3 分鐘） |
| `GEMINI_MAX_OUTPUT_TOKENS` | int | `65536` | 否 | 輸出上限，等於 `gemini-3.5-flash` 的模型上限 |
| `GEMINI_TEMPERATURE` | float | `0.2` | 否 | 降低敘述漂移 |
| `GEMINI_MAX_RETRIES` | int | `2` | 否 | JSON 解析失敗的重試次數 |
| `ANALYSIS_DEFAULT_LOOKBACK_YEARS` | int | `5` | 否 | 滑桿預設值 |
| `ANALYSIS_MIN_LOOKBACK_YEARS` | int | `1` | 否 | 滑桿下界 |
| `ANALYSIS_MAX_LOOKBACK_YEARS` | int | `10` | 否 | 滑桿上界；同時是日行情的保留年數與首次抓取年數（1～10） |
| `MARKET_BENCHMARK_SYMBOL` | string | `IR0001` | 否 | 市場基準（發行量加權股價報酬指數） |
| `PRICE_RETENTION_BUFFER_DAYS` | int | `31` | 否 | 保留期在分析上限之外的緩衝天數（0～366） |
| `ANALYSIS_CACHE_TTL_SECONDS` | int | `86400` | 否 | Redis 快取秒數 |

既有變數（`POSTGRES_*`、`PGADMIN_*`、`REDIS_*`、`N8N_*`、`FRONTEND_PORT`、`BACKEND_PORT`、`COOKIE_SECURE`）維持不變。新增變數需同步更新 `.env.example` 與 `docker-compose.yml` 的 `backend.environment`（`CLAUDE.md` §6 規定）。

## 七、前端樣式導入方式（原 S-03，→ SPEC §2.1）

| # | 決策 |
| --- | --- |
| P-26 | 採 **CSS 自訂屬性（CSS Variables）+ 原生 CSS Modules**，不引入 Tailwind 或 UI 套件庫。理由：`DESIGN.md` 的 token 已是完整色票與尺寸表，直接落成 `:root` 變數最短路徑；引入 Tailwind 會多一層命名映射，且 token 的 30/25/20px 圓角不在 Tailwind 預設刻度內 |
| P-27 | 新增 `frontend/src/styles/tokens.css`：把 `DESIGN.md` 的 light 與 dark 全部 token 落成變數，深色模式用 `@media (prefers-color-scheme: dark)` + `:root[data-theme]` 覆寫 |
| P-28 | 字型：Noto Sans + Noto Sans TC，**直接套用 Google Fonts CDN 連結**（2026-09-20 修訂，原訂自架作廢）。`index.html` 以 `<link rel="preconnect">` + `<link rel="stylesheet">` 載入，`display=swap`。CSP 需允許 `fonts.googleapis.com`（style-src）與 `fonts.gstatic.com`（font-src），此例外寫入 `spec/05-quality.md` §5.1 |
| P-29 | 圖表：採 **Nivo**（2026-09-20 修訂，原訂 Recharts 作廢）。按需引入 `@nivo/heatmap`、`@nivo/bar`、`@nivo/line`。選擇理由：唯一同時具備原生熱圖、React 原生、`theme` 物件可直接餵入 `DESIGN.md` token 值、且體積可接受的方案。**不得**改用後端產圖（靜態 PNG 會失去 hover 數值、深色模式與響應式） |
| P-30 | 既有三個頁面元件的 inline style 全部移除，改用 token；`Landing.tsx` 同時更名為 `Login.tsx`（它做的是登入與註冊）。列為 Phase 1 工作 |

## 八、文件與檔案配置（原 Q-12）

```
web-ai-talent-project/
├── DESIGN.md                        # 維持不動
├── SPEC.md                          # 索引：協議層 + 產品層 + 導航表
└── spec/
    ├── 00-cross-check.md            # 比對與決策紀錄（本輪產出）
    ├── 01-presumed-decisions.md     # 本檔
    ├── 02-system.md
    ├── 03-contract.md
    ├── 04-behavior.md
    ├── 05-quality.md
    ├── 06-execution.md
    ├── prompts/
    │   ├── 01_profile_system_prompt.md      # 問卷解說 system（原 02_system_prompt.txt，改名）
    │   ├── 01_profile_user_prompt.md        # 問卷解說 user template
    │   ├── 02_portfolio_system_prompt.md    # 分析報告 system
    │   └── 03_user_prompt_template.md       # 分析報告 user template
    └── appendix/
        ├── B-constants.md
        ├── C-fixtures.md
        └── E-changelog.md
```

## 九、第四輪之後補充的預設決策

| # | 項目 | 決策 |
| --- | --- | --- |
| P-32 | n8n 排程（2026-09-21 修訂，D-58） | 銀行利率每日 **00:00**；股票基本資料每日 **13:30**；每日股價與大盤每日 **14:00 與 00:00**（台北時間）。n8n 容器已設 `GENERIC_TIMEZONE=Asia/Taipei`，排程直接填本地時間。後端不做排程（`CLAUDE.md` §8）。重試由後端負責（3 次，間隔 5、20 秒），n8n 不設重試；非交易日抓不到新資料不視為錯誤 |
| P-32b | 日收盤價的抓取區間（D-57） | 資料庫已有價格的個股與大盤只抓**近 1 個月**（大盤為 1 個月前的月初至本月）；沒有任何價格者（首次上線、新上市）抓 10 年 + 31 天。以 `(symbol, trade_date)` 覆寫，重跑無副作用，漏抓的日子下次自動補回；停機或連續失敗超過 1 個月則中間缺口補不回來。起訖日由後端計算，n8n 不傳參數 |
| P-32c | 清理的執行時機 | 清理併入每日抓取的最後一步，**全部成功（無失敗）才執行**——避免資料既停止更新又持續縮短 |
| P-33 | findings priority（原 Q-07） | `1 = primary_financial_constraints`、`2 = willingness_capacity_gap`、`3 = horizon_liquidity_consistency`、`4 = knowledge_experience_consistency`。四項全部存入 DB，AI 只在文章中解釋前兩項 |
| P-34 | `cash_flow` fact（原 Y-05） | 列為獨立 fact 輸出，`id = cash_flow`，來源 Q3。理由：`financial_capacity` 判為「低」時，AI 需要指出是哪一項拉低的，缺這個 fact 就只能含糊帶過 |
| P-35 | Q11 選項 J 自由文字 | 欄位 `other_product_text`，`VARCHAR(100)`，僅允許中英數與全形標點，送入 Prompt 前移除換行與控制字元，並以獨立 JSON 欄位傳遞（不串接進任何指令句）。不參與商品經驗分類 |
| P-36 | 圖表元件對應（修訂） | `@nivo/heatmap` → 相關係數熱圖；`@nivo/bar`（水平、分組）→ 權重 vs 風險貢獻、風險落差對照條；`@nivo/line`（含 `enableArea`）→ 淨值走勢與回撤面積。四張圖共用一個 `nivoTheme` 物件，其值全部讀自 `tokens.css` 的 CSS 變數（透過 `getComputedStyle` 取得，深色模式切換時重新計算） |
| P-37 | 分析時的錯誤碼 | `INSUFFICIENT_PRICE_DATA`（無任何共同期間）、`BENCHMARK_UNAVAILABLE`（市場指數缺資料）、`RISK_FREE_RATE_UNAVAILABLE`（無完整五家利率）、`PROFILE_LIMITED`（readiness=limited，依 D-17 擋住）、`AI_REPORT_FAILED`（模型連續解析失敗） |
| P-38 | AI 失敗降級 | 模型逾時或連續 `GEMINI_MAX_RETRIES` 次無法解析為合法 JSON 時，量化結果與四張圖照常顯示，AI 解說區塊顯示「暫時無法產生解說」與重試按鈕，回應 `report.status = "failed"`，不阻擋整頁 |
| P-39 | 交易明細的日期驗證 | `trade_date` 不得晚於今日，不得早於 1990-01-01。日期早於該檔 `daily_quotes` 最早一筆時仍可輸入，僅在持有天數說明旁標註「早於可取得的價格資料起點」 |
| P-40 | 年化持有報酬率的下限 | 持有天數 < 30 日時不計算年化值，顯示「持有期間過短，暫不年化」。理由：短期報酬年化會產生數百甚至上千 % 的誤導性數字 |
| P-41 | 持股列表呈現 | 預設每檔一列，顯示加權平均成本、部位股數、市值、未實現損益、年化持有報酬率；點擊展開顯示該檔的全部買進紀錄（日期、股數、單價、該筆損益、該筆持有天數） |
| P-42 | 熱圖的深色模式色階 | 淺色端使用 `info-container` 與 `error-container`，深色端使用 `dark-info-container` 與 `dark-error-container`，中點一律為當前主題的 `surface`。色階以 `@nivo/heatmap` 的 `colors: {type: "diverging", divergeAt: 0.5}` 設定，定義域固定為 [−1, 1]，不隨資料自動縮放 |
| P-43 | 熱圖的尺寸策略 | 不同股票數 ≤ 20 檔時圖表填滿容器寬度；> 20 檔時固定格子邊長 32px 並開啟水平與垂直捲動。每格一律標出數值（小數點後 2 位），格子邊長 < 28px 時改為僅 hover 顯示數值，並在圖說標註 |
| P-44 | 圖表無障礙 | 四張圖皆須提供 `aria-label` 與可被螢幕閱讀器讀取的資料表替代（`<table>` 置於視覺隱藏容器）。對應 `DESIGN.md` §Charts 的「不得僅以顏色編碼意義」 |

### P-31 Prompt 的執行期位置

`spec/prompts/*.md` 是規格；後端實際讀取的純文字檔放 `backend/app/prompts/*.txt`，由 CI 檢查兩者內容一致（`spec` 為來源，`backend` 為產物）。這樣 Prompt 既受版控、又不必讓後端去 parse Markdown。
