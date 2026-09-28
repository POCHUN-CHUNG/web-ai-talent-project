# 風險分析報告 · 重試提示模板

> 風險分析報告的輸出沒有通過後端內容檢查（`validate_report()`）時，下一次呼叫在原本的 User Prompt 之後**另外附上**這則訊息（Responses API `input` 的第二則 user 訊息），告訴模型上一次錯在哪裡。
> 後端執行時讀取 `backend/app/prompts/risk_analysis_retry.txt`，內容必須與下方區塊逐字相同（測試會比對）。
> 原本的 System Prompt 與 User Prompt 一字不改，所以重試時兩者仍命中 prompt caching；只有這則短訊息是新的輸入。
> 只有「內容檢查不通過」會附上；連線中斷、逾時、429、5xx 的重試不附（上一次沒有輸出可以檢討）。

---

```text
上一次產生的報告沒有通過檢查，原因如下：
{{validation_errors}}
請依系統指令重新產生完整的 JSON，並修正上述問題；其餘內容照原本的規則撰寫。
```

---

## 組裝契約

| 佔位符 | 內容 |
| --- | --- |
| `{{validation_errors}}` | 上一次 `AiOutputInvalid` 的訊息（中文，例如「sections.market_sensitivity 含禁用字詞：R²」），由後端產生、不含使用者資料 |
