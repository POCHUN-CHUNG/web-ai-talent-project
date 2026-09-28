// 【顯示格式化】投資組合相關畫面共用的數字與日期格式（千分位、百分比小數 2 位、金額 0 位小數）。

export const DISCLAIMER = "未納入手續費與交易稅"; // 凡顯示損益處固定標註

// 【金額】千分位、小數 0 位；空值顯示「N/A」。參數：v=後端回傳的金額字串
// 【沒有值時顯示的文字】全系統一致：沒有值、算不出來或還沒有資料時一律顯示「N/A」（不用「-」「—」或空白）
export const NA = "N/A";

export function money(v: string | null | undefined): string {
  if (v == null) return NA;
  return Number(v).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

// 【帶正負號的金額】損益用，正數前面加 +。參數：v=後端回傳的金額字串
export function signedMoney(v: string | null | undefined): string {
  if (v == null) return NA;
  return (Number(v) > 0 ? "+" : "") + money(v);
}

// 【單價／股數】千分位、最多 4 位小數。參數：v=後端回傳的數字字串
export function decimal(v: string | null | undefined): string {
  if (v == null) return NA;
  return Number(v).toLocaleString("zh-TW", { maximumFractionDigits: 4 });
}

// 【百分比】小數 2 位；空值顯示「N/A」。參數：v=比例（0.1371 代表 13.71%）、signed=正數是否加 +
export function pct(v: number | null | undefined, signed = false): string {
  if (v == null) return NA;
  return (signed && v > 0 ? "+" : "") + (v * 100).toFixed(2) + "%";
}

// 【今日（台北）】YYYY-MM-DD，作為買進日期欄位的上限。無參數。
export function todayTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

// 【格式化日期時間】純日期（如「2026-09-24」，沒有時間部分）直接顯示；
// 完整時間（後端回傳的 UTC ISO 字串）轉成本地時間並精確到秒；空值顯示「N/A」。參數：v=後端回傳的日期或日期時間字串
export function formatDateTime(v: string | null | undefined): string {
  if (!v) return NA;
  if (!v.includes("T")) return v;
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 【損益顏色】台股慣例：賺（正）為紅、賠（負）為綠（與投資組合清單頁同一組設計 token）；零或空值不上色。參數：v=損益或報酬率
export function pnlColor(v: string | number | null | undefined): string | undefined {
  if (v == null || Number(v) === 0) return undefined;
  return Number(v) > 0 ? "var(--color-error)" : "var(--color-success)";
}

// 【精簡金額】圖表座標軸用：滿 1 億顯示「x.x億」、滿 1 萬顯示「x.x萬」，其餘照常顯示。參數：v=金額
export function compactMoney(v: number): string {
  const a = Math.abs(v);
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, "");
  if (a >= 1e8) return `${trim(v / 1e8)}億`;
  if (a >= 1e4) return `${trim(v / 1e4)}萬`;
  return Math.round(v).toLocaleString("zh-TW");
}

// 【買進紀錄欄位規則】新增與修改買進紀錄的表單共用（與後端規則一致）
export const MIN_DATE = "1990-01-01"; // 買進日期下限（與後端一致）

// 【檢查買進紀錄欄位】前端先擋常見錯誤（後端仍會再驗一次）；沒問題回空字串。
// 參數：date=買進日期、qty=股數（每股價格由系統依日期帶入，不需檢查）
export function checkLotFields(date: string, qty: string): string {
  if (!date || date < MIN_DATE || date > todayTaipei()) return `買進日期須介於 ${MIN_DATE} 與今日之間`;
  if (!/^[1-9]\d*$/.test(qty.trim())) return "數量須為大於 0 的整數";
  return "";
}

// 【往前推 N 個月】回傳 N 個月前的同一天（該月沒有這一天時取月底，例如 3/31 往前 1 個月是 2/28）；
// 風險分析的分析期間與歷史走勢的區間都用這個算起點，再取範圍內最早一個有資料的交易日。
// 直接對月數做整數運算，沒有浮點誤差。參數：day=YYYY-MM-DD、months=月數
export function monthsBefore(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const targetIndex = y * 12 + (m - 1) - months; // 0-based 月索引（可能為負或超過 11，下面再正規化）
  const ty = Math.floor(targetIndex / 12);
  const tm = targetIndex - ty * 12 + 1; // 1-based 月份
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate(); // 該月最後一天
  return `${ty}-${String(tm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
