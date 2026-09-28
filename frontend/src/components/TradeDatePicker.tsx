import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { api, ApiError } from "../api";
import Icon from "./ui/Icon";
import styles from "./TradeDatePicker.module.css";

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

const WHEEL_ROW = 36; // 滾輪每一列的高度（px）
const WHEEL_ROWS = 5; // 滾輪可見列數（中間一列為選取帶）

// 【滾輪欄】仿 Apple 的年／月滾輪：可上下捲動，停下時對齊到最近的一列；中間的灰色膠囊帶就是目前選的值，也可以直接點選某一列。
// 參數：items=各列（值、顯示文字、是否可選）、value=目前值、onChange=選到新值時通知、label=無障礙說明
function Wheel({ items, value, onChange, label }: {
  items: { value: number; text: string; enabled: boolean }[]; value: number; onChange: (v: number) => void; label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const index = Math.max(0, items.findIndex((i) => i.value === value));

  // 開啟時直接把目前的值捲到中間（不動畫）
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = index * WHEEL_ROW;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 【捲動停止】停下 120ms 後取中間那一列；若該列不可選，就退回最近的可選值
  function onScroll() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      let i = Math.round(el.scrollTop / WHEEL_ROW);
      if (!items[i]?.enabled) {
        const ok = items.map((it, k) => (it.enabled ? k : -1)).filter((k) => k >= 0);
        i = ok.reduce((best, k) => (Math.abs(k - i) < Math.abs(best - i) ? k : best), ok[0] ?? index);
        el.scrollTo({ top: i * WHEEL_ROW, behavior: "smooth" });
      }
      if (items[i] && items[i].value !== value) onChange(items[i].value);
    }, 120);
  }

  // 【點選某一列】捲到中間並選定。參數：i=列序
  function pick(i: number) {
    if (!items[i].enabled) return;
    ref.current?.scrollTo({ top: i * WHEEL_ROW, behavior: "smooth" });
    onChange(items[i].value);
  }

  return (
    <div className={styles.wheel} ref={ref} onScroll={onScroll} role="listbox" aria-label={label}>
      {items.map((it, i) => (
        <div key={it.value} role="option" aria-selected={it.value === value} aria-disabled={!it.enabled}
          className={`${styles.wheelItem} ${it.value === value ? styles.wheelActive : ""} ${it.enabled ? "" : styles.wheelDisabled}`}
          onClick={() => pick(i)}>
          {it.text}
        </div>
      ))}
    </div>
  );
}

// 【買進日期選擇器】點開 iOS 風格的月曆選日期（DESIGN.md「Date picker」）：每週從星期日開始，今天以淡藍圓圈標示、選中的日期為黑色實心圓；
// 只有「該股票有收盤價資料」的日期可以點選，假日、國定假日、休市日與沒資料的日子一律灰掉不能選。
// 尚未選股票時停用。股票更換後若已選日期不在新股票的資料內，會自動清空；autoSelectLatest 開啟時，沒有日期就自動選「距今最近的有資料日期」，
// 避免使用者在休市日新增到錯誤日期。
// 參數：symbol=股票代號（空字串＝尚未選）、value=目前日期（YYYY-MM-DD 或空）、onChange=選好日期後通知、disabled=整個停用、
//      ariaLabel=按鈕的無障礙說明、autoSelectLatest=沒有日期時自動帶入最新的資料日期、
//      requestOpen=要求「聚焦並打開月曆」的次數（每加 1 就要求一次；日期還在載入時會等載入完成才打開）
export default function TradeDatePicker({ symbol, value, onChange, disabled, ariaLabel, autoSelectLatest, requestOpen = 0 }: {
  symbol: string; value: string; onChange: (v: string) => void; disabled?: boolean; ariaLabel?: string; autoSelectLatest?: boolean;
  requestOpen?: number;
}) {
  const [dates, setDates] = useState<Set<string> | null>(null); // null＝尚未取得
  const [range, setRange] = useState<{ first: string; last: string } | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(new Date()); // 月曆目前顯示的月份（每月 1 日）
  const [picking, setPicking] = useState(false); // true＝標題下方顯示年／月滾輪，false＝顯示月曆
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [pendingOpen, setPendingOpen] = useState(false); // 收到「打開」要求、但日期還沒載入完，先記著

  // 【開啟月曆】顯示已選日期所在的月份（沒選就顯示最新資料月份），並回到月曆畫面。參數：force=一定打開（否則切換開／關）
  function openCalendar(force = false) {
    const base = parse(value || range?.last || ymd(new Date()));
    setMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setPicking(false);
    setOpen((o) => force || !o);
  }

  // 【外部要求打開】例如在「標的」用 Enter 選好股票後，游標移到日期並直接打開月曆
  useEffect(() => {
    if (requestOpen > 0) setPendingOpen(true);
  }, [requestOpen]);

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
      if (value && !set.has(value)) onChange(autoSelectLatest && list.length ? list[list.length - 1] : "");
      else if (!value && autoSelectLatest && list.length) onChange(list[list.length - 1]); // 預設選距今最近的資料日期
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

  // 日期載入完成（按鈕可按）後，才執行先前收到的「打開」要求：聚焦按鈕並打開月曆
  useEffect(() => {
    if (!pendingOpen || !ready || disabled) return;
    setPendingOpen(false);
    trigger.current?.focus();
    openCalendar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpen, ready, disabled]);

  return (
    <div ref={box} className={styles.wrap}>
      <button ref={trigger} type="button" className={styles.trigger} onClick={() => openCalendar()} disabled={disabled || !ready}
        aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel}>
        <span className={value ? undefined : styles.placeholder}>
          {value || (!symbol ? "請先輸入標的" : error ? "無法選日期" : dates === null ? "載入中…" : range ? "選擇日期" : "無資料")}
        </span>
      </button>
      {open && ready && range && dates && (() => {
        const first = parse(range.first);
        const last = parse(range.last);
        const minMonth = new Date(first.getFullYear(), first.getMonth(), 1);
        const maxMonth = new Date(last.getFullYear(), last.getMonth(), 1);
        const y = month.getFullYear();
        const m = month.getMonth();
        // 【切換到某年某月】超出資料範圍時夾在範圍內。參數：yy=年、mm=月（0～11）
        const go = (yy: number, mm: number) => {
          const d = new Date(yy, mm, 1);
          setMonth(d < minMonth ? minMonth : d > maxMonth ? maxMonth : d);
        };
        const years = Array.from({ length: last.getFullYear() - first.getFullYear() + 1 }, (_, i) => first.getFullYear() + i)
          .map((v) => ({ value: v, text: `${v} 年`, enabled: true }));
        const months = Array.from({ length: 12 }, (_, i) => ({
          value: i, text: `${i + 1} 月`,
          enabled: !(new Date(y, i, 1) < minMonth || new Date(y, i, 1) > maxMonth),
        }));
        return (
          <div role="dialog" aria-label="選擇買進日期" className={styles.popover}>
            {/* 標題列：左側「年 月 ›」點一下切換成年／月滾輪（箭頭轉向下），右側上一月／下一月 */}
            <div className={styles.head}>
              <button type="button" className={`${styles.headLabel} ${picking ? styles.headLabelOpen : ""}`}
                aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
                {y} 年 {m + 1} 月<Icon name="chevron_right" size={20} />
              </button>
              {!picking && (
                <div className={styles.headNav}>
                  <button type="button" aria-label="上個月" disabled={month <= minMonth} onClick={() => go(y, m - 1)}><Icon name="chevron_left" size={22} /></button>
                  <button type="button" aria-label="下個月" disabled={month >= maxMonth} onClick={() => go(y, m + 1)}><Icon name="chevron_right" size={22} /></button>
                </div>
              )}
            </div>
            {picking ? (
              // 年／月滾輪：兩欄並排，中間的灰色膠囊帶為目前選取
              <div className={styles.wheels}>
                <div className={styles.wheelBand} aria-hidden="true" />
                <Wheel label="選擇年份" items={years} value={y} onChange={(v) => go(v, m)} />
                <Wheel label="選擇月份" items={months} value={m} onChange={(v) => go(y, v)} />
              </div>
            ) : (
              <DayPicker
                mode="single"
                locale={zhTW}
                weekStartsOn={0}
                hideNavigation
                month={month}
                onMonthChange={setMonth}
                startMonth={minMonth}
                endMonth={maxMonth}
                selected={value ? parse(value) : undefined}
                onSelect={(d) => { if (d) { onChange(ymd(d)); setOpen(false); } }}
                disabled={(d) => !dates.has(ymd(d))}
              />
            )}
          </div>
        );
      })()}
      {error && <div role="alert" className={styles.error}>{error}</div>}
    </div>
  );
}
