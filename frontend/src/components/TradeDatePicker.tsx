import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { api, ApiError } from "../api";

const cache = new Map<string, string[]>(); // 代號 → 有資料的日期（同一代號只向後端查一次）

// 【日期轉字串】把日曆上的日期轉成 YYYY-MM-DD（使用本地日期，避免時區造成差一天）。參數：d=日期
function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 【字串轉日期】YYYY-MM-DD 轉成本地日期物件。參數：s=日期字串
function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 【買進日期選擇器】點開日曆選日期；只有「該股票有收盤價資料」的日期可以點選，假日、國定假日、休市日與沒資料的日子一律灰掉不能選。
// 尚未選股票時停用。股票更換後若已選日期不在新股票的資料內，會自動清空。
// 參數：symbol=股票代號（空字串＝尚未選）、value=目前日期（YYYY-MM-DD 或空）、onChange=選好日期後通知、disabled=整個停用
export default function TradeDatePicker({ symbol, value, onChange, disabled }: { symbol: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [dates, setDates] = useState<Set<string> | null>(null); // null＝尚未取得
  const [range, setRange] = useState<{ first: string; last: string } | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // 【取得有資料的日期】換股票時向後端查（有快取）；查到後若目前日期不在其中就清空
  useEffect(() => {
    setOpen(false);
    setError("");
    if (!symbol) { setDates(null); setRange(null); return; }
    let stale = false;
    setDates(null);
    const apply = (list: string[]) => {
      if (stale) return;
      const set = new Set(list);
      setDates(set);
      setRange(list.length ? { first: list[0], last: list[list.length - 1] } : null);
      if (value && !set.has(value)) onChange("");
    };
    const hit = cache.get(symbol);
    if (hit) apply(hit);
    else api<{ dates: string[] }>(`/stocks/${symbol}/trading-dates`)
      .then((r) => { cache.set(symbol, r.dates); apply(r.dates); })
      .catch((e) => { if (!stale) setError(e instanceof ApiError ? e.message : "取得可選日期失敗"); });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // 點日曆外面就收起
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const ready = !!symbol && dates !== null && !!range;
  return (
    <div ref={box} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} disabled={disabled || !ready} aria-haspopup="dialog" aria-expanded={open} style={{ minWidth: 140 }}>
        {value || (!symbol ? "請先選股票" : error ? "無法選日期" : dates === null ? "載入中…" : range ? "選擇日期" : "無資料")}
      </button>
      {open && ready && range && dates && (
        <div role="dialog" aria-label="選擇買進日期" style={{ position: "absolute", zIndex: 20, background: "#fff", border: "1px solid #999", padding: 8 }}>
          <DayPicker
            mode="single"
            locale={zhTW}
            captionLayout="dropdown"
            startMonth={parse(range.first)}
            endMonth={parse(range.last)}
            defaultMonth={parse(value || range.last)}
            selected={value ? parse(value) : undefined}
            onSelect={(d) => { if (d) { onChange(ymd(d)); setOpen(false); } }}
            disabled={(d) => !dates.has(ymd(d))}
          />
          <div style={{ fontSize: "0.8rem", color: "#666" }}>灰色日期沒有這檔股票的資料（假日或休市日），無法選取。可選範圍 {range.first} ～ {range.last}</div>
        </div>
      )}
      {error && <div role="alert" style={{ color: "#b91c1c", fontSize: "0.85rem" }}>{error}</div>}
    </div>
  );
}
