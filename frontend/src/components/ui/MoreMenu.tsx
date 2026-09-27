import { useEffect, useRef, useState } from "react";
import IconButton from "./IconButton";
import styles from "./MoreMenu.module.css";

export type MoreMenuItem = {
  label: string; // 選項文字
  onSelect: () => void; // 點選後執行（選單會先自動收起）
  danger?: boolean; // 危險操作（如刪除）以紅字顯示
};

// 【更多選單】直向三個點（more_vert）的圖示按鈕（40×40px，DESIGN.md 圖示按鈕規格），點擊後在下方展開液態玻璃選單，
// 樣式與頂端列的帳戶選單相同；點選單以外的地方或按 Esc 會收起。
// 參數：label=按鈕的無障礙說明（如「元大 的更多操作」）、items=選項清單、className=外框額外樣式（用來定位）
export default function MoreMenu({ label, items, className }: { label: string; items: MoreMenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 展開時：點選單以外的地方或按 Esc 就收起
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={[styles.wrap, className].filter(Boolean).join(" ")}>
      <IconButton icon="more_vert" label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div className={styles.menu} role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem"
              className={`${styles.item} ${it.danger ? styles.danger : ""}`}
              onClick={() => { setOpen(false); it.onSelect(); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
