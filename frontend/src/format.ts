// 【顯示格式化】投資組合相關畫面共用的數字與日期格式（千分位、百分比小數 2 位、金額 0 位小數）。

export const DISCLAIMER = "未納入手續費與交易稅"; // 凡顯示損益處固定標註
export const TOO_SHORT = "持有期間過短，暫不年化"; // 持有天數未滿 30 日不年化時的說明

// 【金額】千分位、小數 0 位；空值顯示「—」。參數：v=後端回傳的金額字串
export function money(v: string | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

// 【帶正負號的金額】損益用，正數前面加 +。參數：v=後端回傳的金額字串
export function signedMoney(v: string | null | undefined): string {
  if (v == null) return "—";
  return (Number(v) > 0 ? "+" : "") + money(v);
}

// 【單價／股數】千分位、最多 4 位小數。參數：v=後端回傳的數字字串
export function decimal(v: string | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toLocaleString("zh-TW", { maximumFractionDigits: 4 });
}

// 【百分比】小數 2 位；空值顯示「—」。參數：v=比例（0.1371 代表 13.71%）、signed=正數是否加 +
export function pct(v: number | null | undefined, signed = false): string {
  if (v == null) return "—";
  return (signed && v > 0 ? "+" : "") + (v * 100).toFixed(2) + "%";
}

// 【今日（台北）】YYYY-MM-DD，作為買進日期欄位的上限。無參數。
export function todayTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

// 【損益顏色】台股慣例：賺（正）為紅、賠（負）為綠；零或空值不上色。參數：v=損益或報酬率
export function pnlColor(v: string | number | null | undefined): string | undefined {
  if (v == null || Number(v) === 0) return undefined;
  return Number(v) > 0 ? "#c0392b" : "#1e8449";
}

// 【買進紀錄欄位規則】新增與修改買進紀錄的表單共用（與後端規則一致）
export const MIN_DATE = "1990-01-01"; // 買進日期下限（與後端一致）
export const NUM_RE = /^\d+(\.\d{1,4})?$/; // 正數、小數最多 4 位

// 【格式化為 4 位小數】輸入框失焦時把合法數字補成 4 位小數；不合法就原樣保留（送出時會被擋下）。參數：v=輸入的文字
export function fix4(v: string): string {
  const t = v.trim();
  return NUM_RE.test(t) ? Number(t).toFixed(4) : v;
}

// 【檢查買進紀錄欄位】前端先擋常見錯誤（後端仍會再驗一次）；沒問題回空字串。
// 參數：date=買進日期、qty=股數（每股價格由系統依日期帶入，不需檢查）
export function checkLotFields(date: string, qty: string): string {
  if (!date || date < MIN_DATE || date > todayTaipei()) return `買進日期須介於 ${MIN_DATE} 與今日之間`;
  if (!NUM_RE.test(qty.trim()) || Number(qty) <= 0) return "股數須為大於 0 的數字，小數最多 4 位";
  return "";
}

// 【價格來源說明】新增或修改買進紀錄時，固定提示每股價格的來源與可能的差異
export const PRICE_NOTE = "每股價格由系統帶入買進日當天的「調整後收盤價」（已還原除權息），可能與當時實際成交價不同，不用擔心，系統統一以此計算成本與損益。";
