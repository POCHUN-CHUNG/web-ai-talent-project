import { KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import styles from "./Select.module.css";

// 一個可選項目：value=送出用的值、label=顯示文字、disabled=不可選（原因請寫進 label，例如「（尚無持股）」）
export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string; // 尚未選擇時顯示的提示文字，一律以「請選擇」開頭
  disabled?: boolean; // 選項仍在載入中時使用（而非不能選）
  className?: string;
};

const EDGE = 8; // 清單距離可用區域上下邊緣（畫面邊緣或導覽列）的最小間距（px）
const SEAM_OVERLAP = 1; // 清單與按鈕接縫處重疊的像素（px），避免接縫透出細線

type Pos = { left: number; width: number; top?: number; bottom?: number; maxHeight: number; openUp: boolean };

// 【可用的垂直範圍】畫面扣掉固定在上方的頂端列與固定在下方的手機分頁列（標有 data-fixed-chrome 的元素），
// 清單只能出現在這個範圍內，不可蓋住導覽列。無參數；回傳 {top, bottom}（畫面座標，px）
function usableArea(): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;
  document.querySelectorAll<HTMLElement>("[data-fixed-chrome]").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height === 0) return;
    if (r.top + r.height / 2 < window.innerHeight / 2) top = Math.max(top, r.bottom);
    else bottom = Math.min(bottom, r.top);
  });
  return { top, bottom };
}

// 【下拉選單】取代原生 <select>：觸發按鈕維持原本外觀與背景（不隨展開改變），展開時清單直接接在按鈕下方（或上方），
// 兩者合成同一個連續方框、不斷線，比照 DESIGN.md「Search box with attached results」；
// 清單本身掛到 body（卡片的毛玻璃會讓 fixed 定位失準，也才不會被其他卡片蓋住），
// 預設往下展開，下方空間不足且上方空間更多時自動改往上展開。
// 參數：id、ariaLabel、value=目前選到的值、onChange=選擇改變時呼叫、options=可選項目、placeholder=尚未選擇時的提示文字、disabled=停用、className
export default function Select({ id, ariaLabel, value, onChange, options, placeholder, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // 用上下鍵移動的目前選項（-1＝沒有）
  const [pos, setPos] = useState<Pos | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  // 【定位】依觸發按鈕與清單的完整高度，決定往下或往上展開；清單與按鈕之間沒有間距，緊接成同一個方框。
  // 可用空間扣掉導覽列（頂端列、手機底部分頁列），清單不會蓋住它們；兩邊都放不下時，清單限高並在內部捲動
  const place = useCallback(() => {
    const btn = btnRef.current;
    const list = listRef.current;
    if (!btn || !list) return;
    const r = btn.getBoundingClientRect();
    const area = usableArea();
    const listHeight = list.scrollHeight + (list.offsetHeight - list.clientHeight); // 完整內容高度＋框線，不受上一次限高影響
    const spaceBelow = area.bottom - r.bottom - EDGE;
    const spaceAbove = r.top - area.top - EDGE;
    const openUp = spaceBelow < listHeight && spaceAbove > spaceBelow; // 預設往下，下方放不下且上方更寬敞才往上
    // 接縫處對齊到實體像素（高解析度螢幕 1 CSS px 不等於 1 實體像素）並讓清單多蓋進按鈕 1px：
    // 按鈕常落在小數像素位置，清單邊緣（含被切掉的陰影）反鋸齒後會在接縫透出一條灰線
    const dpr = window.devicePixelRatio || 1;
    const snap = (v: number) => Math.round(v * dpr) / dpr;
    setPos({
      left: r.left,
      width: r.width,
      top: openUp ? undefined : snap(r.bottom) - SEAM_OVERLAP,
      bottom: openUp ? window.innerHeight - snap(r.top) - SEAM_OVERLAP : undefined,
      maxHeight: Math.max(0, openUp ? spaceAbove : spaceBelow),
      openUp,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  // 【展開時】點外面或按 Esc 收起；捲動或改變視窗大小時跟著重新定位
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // 【展開／收合】展開時把目前選到的項目設成上下鍵的起點
  function toggle() {
    if (disabled) return;
    setOpen((v) => {
      if (!v) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      return !v;
    });
  }

  function choose(o: SelectOption) {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
  }

  // 【鍵盤操作】上下鍵移動（跳過停用選項，第一筆／最後一筆不繞回）、Enter 選取、Esc 收起
  function onKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { toggle(); return; }
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => {
        for (let n = i; ; ) {
          n += dir;
          if (n < 0 || n >= options.length) return i;
          if (!options[n].disabled) return n;
        }
      });
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && active >= 0) choose(options[active]);
      else toggle();
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  const openUp = pos?.openUp ?? false;

  return (
    <div ref={wrapRef} className={[styles.wrap, className].filter(Boolean).join(" ")}>
      <button ref={btnRef} type="button" id={id} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
        disabled={disabled}
        className={[styles.trigger, open ? (openUp ? styles.triggerJoinUp : styles.triggerJoinDown) : ""].filter(Boolean).join(" ")}
        onClick={toggle} onKeyDown={onKeyDown}>
        <span className={current ? styles.value : styles.placeholder}>{current ? current.label : placeholder}</span>
        <span className={styles.iconBox}><Icon name={open ? "expand_less" : "expand_more"} size={20} className={styles.icon} /></span>
      </button>
      {open && createPortal(
        <div ref={listRef} className={[styles.floatingList, openUp ? styles.floatingListUp : styles.floatingListDown].join(" ")}
          style={pos ? { left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight } : { visibility: "hidden", left: 0, top: 0 }}>
          <ul role="listbox" aria-label={ariaLabel} className={styles.options}>
            {options.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value} aria-disabled={o.disabled || undefined}>
                <button type="button" tabIndex={-1} disabled={o.disabled}
                  className={i === active ? styles.optionActive : undefined}
                  onMouseEnter={() => !o.disabled && setActive(i)} onClick={() => choose(o)}>
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
