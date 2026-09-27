import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import TradeDatePicker from "./TradeDatePicker";
import Button from "./ui/Button";
import Chip from "./ui/Chip";
import Icon from "./ui/Icon";
import IconButton from "./ui/IconButton";
import Input from "./ui/Input";
import { MIN_DATE, checkLotFields, decimal, money, NA, todayTaipei } from "../format";
import { enterToNextField } from "../formKeys";
import styles from "./LotForm.module.css";
import modalStyles from "./ui/Modal.module.css";

type Stock = { symbol: string; name: string; market: string; industry: string };
// 修改模式要帶入的原本那筆紀錄
export type EditingLot = { id: number; symbol: string; name: string; tradeDate: string; quantity: string };
const DEBOUNCE_MS = 300; // 輸入停止 0.3 秒後才查詢，避免每打一個字就呼叫後端
const QTY_RE = /\D/g; // 數量只允許整數（非數字的字元輸入時直接濾掉）

// 【買進紀錄表單】放在彈出視窗內使用，新增與修改共用：
// 1. 標的：輸入代號或名稱即搜尋，結果清單直接接在輸入框下方；查無結果時清單只顯示一列不可選的「查無資料」。
//    右側收合鈕或點選其他地方都只會收起清單、保留已輸入的文字（再點輸入框會重新展開）；清空輸入框也會收起清單。
//    修改模式時標的固定不可更換（以與「持有成本」相同的唯讀欄位樣式顯示；代號不能改，買錯請刪除後重建）。
// 2. 日期（選好標的後自動帶入距今最近的資料日期）、數量（大於 0 的整數，純文字輸入，不用上下調整鈕）。
// 3. 每股價格（系統依買進日帶入的調整後收盤價）與持有成本（價格 × 數量）以唯讀欄位即時顯示。
// 按鈕永遠可以按（DESIGN.md）：送出時才檢查，有問題就在按鈕上方顯示紅色錯誤提示。
// 參數：portfolioId=組合編號、editing=要修改的那筆紀錄（新增時省略）、onDone=新增／修改成功後執行、onCancel=按「取消」關閉視窗
export default function LotForm({ portfolioId, editing, onDone, onCancel }: {
  portfolioId: number; editing?: EditingLot; onDone: () => void; onCancel: () => void;
}) {
  const isEdit = !!editing;
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Stock[]>([]);
  const [open, setOpen] = useState(false); // 搜尋清單是否展開
  const [active, setActive] = useState(-1); // 用上下鍵選到的選項位置（-1＝沒有選到）
  const [searched, setSearched] = useState(""); // 最近一次查詢完成的關鍵字（清單為空且等於目前關鍵字時顯示「查無資料」）
  const [selected, setSelected] = useState<Stock | null>(editing ? { symbol: editing.symbol, name: editing.name, market: "", industry: "" } : null);
  const [date, setDate] = useState(editing?.tradeDate ?? "");
  const [qty, setQty] = useState(editing ? String(Number(editing.quantity)) : ""); // 顯示為整數（不補 .0000）
  // 系統依「股票＋買進日」查到的收盤價：loading＝查詢中、ok＝有價、error＝查不到（含原因）
  const [quote, setQuote] = useState<{ state: "idle" | "loading" | "ok" | "error"; price?: string; msg?: string }>({ state: "idle" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const quoteSeq = useRef(0); // 收盤價查詢序號（在條件改變時作廢舊請求）
  const seq = useRef(0); // 搜尋請求序號：只採用最新一次的結果，避免舊回應覆蓋新結果
  const comboRef = useRef<HTMLDivElement>(null);

  // 【搜尋股票】輸入文字後去抖 300ms 再查詢，最多 20 筆；清空輸入框就關閉清單；查無結果時在清單中顯示「查無資料」
  useEffect(() => {
    const q = query.trim();
    if (selected || !q) { seq.current++; setOptions([]); setSearched(""); setOpen(false); return; }
    const mine = ++seq.current;
    const t = window.setTimeout(async () => {
      try {
        const r = await api<{ items: Stock[] }>(`/stocks?q=${encodeURIComponent(q)}&limit=20`);
        if (mine !== seq.current) return;
        setOptions(r.items);
        setSearched(q);
        setActive(-1);
        setOpen(true);
      } catch {
        if (mine === seq.current) setOptions([]);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query, selected]);

  // 【點選其他地方】只收起搜尋清單，保留已輸入的文字
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [selected]);

  // 【查收盤價】選好股票與日期後自動查該日調整後收盤價；只採用最新一次的結果
  useEffect(() => {
    if (!selected || !date || date < MIN_DATE || date > todayTaipei()) { quoteSeq.current++; setQuote({ state: "idle" }); return; }
    const mine = ++quoteSeq.current;
    setQuote({ state: "loading" });
    api<{ adjClose: string }>(`/stocks/${selected.symbol}/close?date=${date}`)
      .then((r) => { if (mine === quoteSeq.current) setQuote({ state: "ok", price: r.adjClose }); })
      .catch((e) => { if (mine === quoteSeq.current) setQuote({ state: "error", msg: e instanceof ApiError ? e.message : "查詢收盤價失敗" }); });
  }, [selected, date]);

  // 【選定股票】收起清單、清除錯誤。參數：o=選到的股票、focusQty=是否接著把游標移到「數量」（鍵盤選取時用）
  function choose(o: Stock, focusQty = false) {
    setSelected(o);
    setOptions([]);
    setOpen(false);
    setActive(-1);
    setError("");
    if (focusQty) window.setTimeout(() => document.getElementById("lotQty")?.focus());
  }

  // 【明確的那一檔】只有一筆結果，或輸入的代號與某筆完全相同時，回傳該筆；否則回傳 null。參數：list=搜尋結果、q=輸入文字
  function exactMatch(list: Stock[], q: string): Stock | null {
    if (list.length === 1) return list[0];
    return list.find((o) => o.symbol.toUpperCase() === q.toUpperCase()) ?? null;
  }

  // 【標的鍵盤操作】上下鍵移動選項、Enter 帶入、Esc 收起清單。參數：e=輸入框的鍵盤事件
  async function onSymbolKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return; // 輸入法選字中不處理
    const q = query.trim();
    const ready = q && searched === q; // 目前清單是否就是這個關鍵字的結果
    // 1. 上下鍵：在清單中移動（清單收起時先展開），到第一筆或最後一筆就停住，不繞回另一端
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && ready && options.length > 0) {
      e.preventDefault();
      const n = options.length;
      if (!open) { setOpen(true); setActive(e.key === "ArrowDown" ? 0 : n - 1); return; }
      setActive((i) => (e.key === "ArrowDown" ? Math.min(i + 1, n - 1) : Math.max(i - 1, 0)));
      return;
    }
    // 2. Esc：清單開著時只收起清單，不關閉整個視窗
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key !== "Enter" || !q) return;
    // 3. Enter：不交給表單（不跳格、不送出），由這裡決定要帶入哪一檔
    e.preventDefault();
    e.stopPropagation();
    // 3-1. 用上下鍵選了某一項 → 帶入該項
    if (open && active >= 0 && options[active]) return choose(options[active], true);
    // 3-2. 清單已是最新結果 → 只有一檔或代號完全相同時直接帶入；否則展開清單讓使用者選
    if (ready) {
      const hit = exactMatch(options, q);
      if (hit) return choose(hit, true);
      if (options.length > 0) { setOpen(true); setActive(0); }
      return;
    }
    // 3-3. 還在等待搜尋（打完字立刻按 Enter）→ 馬上查一次，結果明確就直接帶入
    const mine = ++seq.current;
    try {
      const r = await api<{ items: Stock[] }>(`/stocks?q=${encodeURIComponent(q)}&limit=20`);
      if (mine !== seq.current) return;
      const hit = exactMatch(r.items, q);
      if (hit) return choose(hit, true);
      setOptions(r.items);
      setSearched(q);
      setActive(r.items.length > 0 ? 0 : -1);
      setOpen(true);
    } catch {
      if (mine === seq.current) setOptions([]);
    }
  }

  // 【送出】依序檢查股票、日期與數量、買進日價格，全部通過才送出新增或修改
  async function submit(e: FormEvent) {
    e.preventDefault();
    // 1. 檢查輸入
    if (!selected) return setError(query.trim() ? "請從清單中選擇正確的股票" : "請輸入股票代號或名稱");
    const msg = checkLotFields(date, qty);
    if (msg) return setError(msg);
    if (quote.state === "loading") return setError("正在查詢買進日的價格，請稍候再送出");
    if (quote.state !== "ok") return setError(quote.msg || "查不到買進日的價格，請改選其他日期");
    // 2. 送出
    setBusy(true);
    setError("");
    try {
      if (editing) {
        const body: Record<string, string> = {};
        if (date !== editing.tradeDate) body.tradeDate = date;
        if (Number(qty) !== Number(editing.quantity)) body.quantity = qty.trim();
        if (Object.keys(body).length > 0) await api(`/portfolios/${portfolioId}/holding-lots/${editing.id}`, body, "PATCH");
      } else {
        await api(`/portfolios/${portfolioId}/holding-lots`, { symbol: selected.symbol, tradeDate: date, quantity: qty.trim() });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : isEdit ? "修改失敗，請稍後再試" : "新增失敗，請稍後再試");
      setBusy(false);
    }
  }

  // 唯讀欄位顯示的每股價格與持有成本
  const priceText = quote.state === "ok" ? decimal(quote.price) : quote.state === "loading" ? "查詢中…" : NA;
  const costText = quote.state === "ok" && Number(qty) > 0 ? money(String(Number(qty) * Number(quote.price))) : NA;

  return (
    <form onSubmit={submit} onKeyDown={enterToNextField} className={styles.form} noValidate>
      {/* 1. 標的：搜尋框，結果清單直接接在輸入框下方；修改時固定不可更換，以唯讀欄位顯示 */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="lotSymbol">標的</label>
        {/* 修改時標的不可更換：以與「持有成本」相同的唯讀欄位顯示 */}
        {isEdit && selected ? (
          <div id="lotSymbol" className={styles.readonly} aria-label="標的（不可更改）">
            <span className={styles.code}>{selected.symbol}</span>&nbsp;{selected.name}
          </div>
        ) : (
        // 固定高度的位置：展開時整個搜尋框（輸入框＋清單）浮在上方，不把下方欄位往下推
        <div className={styles.comboSlot}>
          <div ref={comboRef} className={`${styles.combo} ${open ? styles.comboOpen : ""}`}>
            <div className={styles.comboInput}>
              {selected ? (
                <span className={styles.comboValue}><span className={styles.code}>{selected.symbol}</span>{selected.name}</span>
              ) : (
                <input id="lotSymbol" value={query} autoFocus autoComplete="off" placeholder="請輸入代號或名稱" disabled={busy}
                  role="combobox" aria-expanded={open} aria-controls="lotSymbolList"
                  aria-activedescendant={open && active >= 0 ? `lotOpt-${active}` : undefined}
                  onKeyDown={onSymbolKey}
                  onChange={(e) => { setQuery(e.target.value); setError(""); }}
                  onClick={() => { if (query.trim() && searched === query.trim()) setOpen(true); }}
                  onFocus={() => { if (query.trim() && searched === query.trim()) setOpen(true); }} />
              )}
              {/* 右側：已選股票（新增時）為清除鈕；輸入中為收合／展開鈕；空白時為搜尋圖示 */}
              {selected && !isEdit ? (
                <IconButton icon="close" label="重新選擇股票" onClick={() => { setSelected(null); setQuery(""); setDate(""); }} />
              ) : !selected && query.trim() && searched === query.trim() ? (
                <IconButton icon={open ? "expand_less" : "expand_more"} label={open ? "收合清單" : "展開清單"} onClick={() => setOpen((v) => !v)} />
              ) : !selected ? (
                <span className={styles.comboIcon}><Icon name="search" size={22} /></span>
              ) : null}
            </div>
            {open && (
              <ul id="lotSymbolList" role="listbox" aria-label="搜尋結果" className={styles.options}>
                {options.length > 0 ? options.map((o, i) => (
                  <li key={o.symbol} id={`lotOpt-${i}`} role="option" aria-selected={i === active}>
                    {/* tabIndex -1：鍵盤用上下鍵選，不用 Tab 逐一經過；滑鼠移入時同步成目前選項 */}
                    <button type="button" tabIndex={-1} className={i === active ? styles.optionActive : undefined}
                      ref={i === active ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                      onMouseEnter={() => setActive(i)} onClick={() => choose(o)}>
                      <span className={styles.code}>{o.symbol}</span>
                      <span className={styles.optionName}>{o.name}</span>
                      <span className={styles.optionMeta}>{o.market}{o.industry ? `・${o.industry}` : ""}</span>
                    </button>
                  </li>
                )) : (
                  // 查無結果：一列不可選的「查無資料」（中性色，不用紅字）
                  <li role="option" aria-selected={false} aria-disabled="true" className={styles.noResult}>查無資料</li>
                )}
              </ul>
            )}
          </div>
        </div>
        )}
      </div>

      {/* 2. 日期與數量 */}
      <div className={styles.row}>
        <div className={styles.field}>
          <span className={styles.label}>日期</span>
          <TradeDatePicker symbol={selected?.symbol ?? ""} value={date} onChange={(v) => { setDate(v); setError(""); }} disabled={busy} ariaLabel="買進日期" autoSelectLatest />
        </div>
        <Input id="lotQty" label="數量" type="text" inputMode="numeric" value={qty} placeholder="請輸入股數" disabled={busy}
          onChange={(e) => { setQty(e.target.value.replace(QTY_RE, "")); setError(""); }} />
      </div>

      {/* 3. 系統帶入的每股價格與持有成本（唯讀） */}
      <div className={styles.row}>
        <div className={styles.field}>
          <span className={styles.label}>每股價格</span>
          <div className={styles.readonly} aria-live="polite">{priceText}{quote.state === "ok" && <span className={styles.unit}>元</span>}</div>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>持有成本</span>
          <div className={styles.readonly}>{costText}{costText !== NA && <span className={styles.unit}>元</span>}</div>
        </div>
      </div>

      {/* 錯誤訊息（DESIGN.md）：錯誤 Chip，位於輸入區與按鈕之間 */}
      {error && <Chip variant="error">{error}</Chip>}
      {/* 按鈕列（DESIGN.md）：取消在左、送出在右，平均填滿寬度；按鈕永遠可按，送出時才檢查 */}
      <div className={modalStyles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>取消</Button>
        <Button type="submit" busy={busy}>{busy ? (isEdit ? "儲存中…" : "新增中…") : isEdit ? "儲存" : "新增"}</Button>
      </div>
    </form>
  );
}
