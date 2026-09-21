import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import TradeDatePicker from "./TradeDatePicker";
import { MIN_DATE, PRICE_NOTE, checkLotFields, decimal, fix4, todayTaipei } from "../format";

type Stock = { symbol: string; name: string; market: string; industry: string };
const DEBOUNCE_MS = 300; // 輸入停止 0.3 秒後才查詢，避免每打一個字就呼叫後端
// 【新增買進紀錄表單】代號欄輸入 1 字即搜尋（代號或名稱），必須從下拉清單選取；再填買進日期、股數、每股價格後送出。
// 參數：portfolioId=組合編號、preset=預先帶入的股票（從某檔持股按「再買一筆」時用）、onAdded=新增成功後通知頁面重新載入
export default function LotForm({ portfolioId, preset, onAdded }: { portfolioId: number; preset: Stock | null; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Stock[]>([]);
  const [selected, setSelected] = useState<Stock | null>(preset);
  const [date, setDate] = useState("");
  const [qty, setQty] = useState("");
  // 系統依「股票＋買進日」查到的收盤價：loading＝查詢中、ok＝有價、error＝查不到（含原因）
  const [quote, setQuote] = useState<{ state: "idle" | "loading" | "ok" | "error"; price?: string; msg?: string }>({ state: "idle" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const quoteSeq = useRef(0); // 收盤價查詢序號（與搜尋各自獨立，並在條件改變時作廢舊請求）
  const seq = useRef(0); // 搜尋請求序號：只採用最新一次的結果，避免舊回應覆蓋新結果

  // 外部指定了新的股票（按「再買一筆」）就直接選好
  useEffect(() => { if (preset) { setSelected(preset); setQuery(""); } }, [preset]);

  // 【搜尋股票】輸入文字後去抖 300ms 再查詢，最多 20 筆
  useEffect(() => {
    const q = query.trim();
    if (selected || !q) { setOptions([]); return; }
    const mine = ++seq.current;
    const t = window.setTimeout(async () => {
      try {
        const r = await api<{ items: Stock[] }>(`/stocks?q=${encodeURIComponent(q)}&limit=20`);
        if (mine === seq.current) setOptions(r.items);
      } catch {
        if (mine === seq.current) setOptions([]);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query, selected]);

  // 【查收盤價】選好股票與日期後自動查該日調整後收盤價；只採用最新一次的結果
  useEffect(() => {
    if (!selected || !date || date < MIN_DATE || date > todayTaipei()) { quoteSeq.current++; setQuote({ state: "idle" }); return; }
    const mine = ++quoteSeq.current;
    setQuote({ state: "loading" });
    api<{ adjClose: string }>(`/stocks/${selected.symbol}/close?date=${date}`)
      .then((r) => { if (mine === quoteSeq.current) setQuote({ state: "ok", price: r.adjClose }); })
      .catch((e) => { if (mine === quoteSeq.current) setQuote({ state: "error", msg: e instanceof ApiError ? e.message : "查詢收盤價失敗" }); });
  }, [selected, date]);

  // 【送出】驗證後新增一筆買進紀錄
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return setError("請從清單選擇股票");
    const msg = checkLotFields(date, qty);
    if (msg) return setError(msg);
    if (quote.state !== "ok") return setError("尚未取得買進日的收盤價，請確認股票與日期");
    setBusy(true);
    setError("");
    try {
      await api(`/portfolios/${portfolioId}/holding-lots`, { symbol: selected.symbol, tradeDate: date, quantity: fix4(qty) });
      setQty(""); setDate(""); setSelected(null); setQuery("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "新增失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ border: "1px solid #ccc", padding: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>新增買進紀錄</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
        <div style={{ position: "relative" }}>
          <label>股票<br />
            {selected ? (
              <span>{selected.symbol} {selected.name}{selected.market ? `（${selected.market}）` : ""}{" "}
                <button type="button" onClick={() => { setSelected(null); setQuery(""); }} disabled={busy}>更換</button></span>
            ) : (
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="輸入代號或名稱，如 2330、台積" disabled={busy} />
            )}
          </label>
          {!selected && options.length > 0 && (
            <ul role="listbox" style={{ position: "absolute", zIndex: 10, background: "#fff", border: "1px solid #999", listStyle: "none", margin: 0, padding: 0, maxHeight: 240, overflowY: "auto", minWidth: 260 }}>
              {options.map((o) => (
                <li key={o.symbol} role="option" aria-selected={false} style={{ padding: "4px 8px", cursor: "pointer" }}
                  onClick={() => { setSelected(o); setOptions([]); }}>
                  {o.symbol} {o.name}　<small>{o.market}</small>
                </li>
              ))}
            </ul>
          )}
          {!selected && query.trim() && options.length === 0 && <div style={{ fontSize: "0.85rem", color: "#666" }}>沒有符合的股票（或仍在搜尋）</div>}
        </div>
        <div>買進日期<br /><TradeDatePicker symbol={selected?.symbol ?? ""} value={date} onChange={setDate} disabled={busy} /></div>
        <label>股數<br /><input type="number" inputMode="decimal" step="any" min="0" value={qty} onChange={(e) => setQty(e.target.value)} onBlur={() => setQty(fix4(qty))} disabled={busy} style={{ width: 120 }} /></label>
        <button disabled={busy || quote.state !== "ok"}>{busy ? "新增中…" : "新增"}</button>
      </div>
      {/* 自動帶入的每股價格與來源說明 */}
      <div style={{ marginTop: 8 }} aria-live="polite">
        {quote.state === "idle" && <span style={{ color: "#666" }}>選好股票與日期後，會自動帶入當天收盤價（日期只能選該股票有資料的交易日）。</span>}
        {quote.state === "loading" && <span>查詢收盤價中…</span>}
        {quote.state === "ok" && (
          <span>每股價格（調整後收盤價）：<b>{decimal(quote.price)}</b> 元</span>
        )}
        {quote.state === "error" && <span role="alert" style={{ color: "#b91c1c" }}>{quote.msg}</span>}
        <div style={{ fontSize: "0.85rem", color: "#666" }}>{PRICE_NOTE}</div>
      </div>
      {error && <div role="alert" style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div>}
    </form>
  );
}
