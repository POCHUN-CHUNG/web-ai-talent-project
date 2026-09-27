import { ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import IconButton from "./IconButton";
import styles from "./InfoPopover.module.css";

const GAP = 8; // 彈出框與圖示按鈕之間的距離（px）
const EDGE = 16; // 彈出框距離畫面左右邊緣的最小間距（px）

type Pos = { top: number; left: number; origin: number }; // origin=圖示中心相對框左緣的位置（放大動畫的起點）

// 【說明彈出框】只顯示一個 info 圖示按鈕，滑鼠移上去或點一下時，在圖示下方跳出 iOS 風格的液態玻璃彈出框。
// 點框外或按 Esc 收起；捲動時框會跟著圖示移動，位置自動避開畫面左右邊緣。
// 參數：label=圖示按鈕的無障礙說明、children=彈出框內的說明文字、className=外層額外樣式
export default function InfoPopover({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const pointer = useRef(""); // 最近一次點擊的裝置類型（mouse／touch／pen）

  // 1. 依按鈕位置算出彈出框座標：優先以圖示為中心，超出畫面時往內推，箭頭仍對準圖示
  const place = useCallback(() => {
    const btn = wrapRef.current?.querySelector("button");
    const box = boxRef.current;
    if (!btn || !box) return;
    const r = btn.getBoundingClientRect();
    const w = box.offsetWidth;
    const center = r.left + r.width / 2;
    const left = Math.min(Math.max(center - w / 2, EDGE), window.innerWidth - EDGE - w);
    setPos({ top: r.bottom + GAP, left, origin: center - left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  // 2. 開啟時：點框外或按 Esc 收起；捲動或改變視窗大小時跟著圖示重新定位
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !boxRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // 3. 滑鼠移入開啟、移出收起（滑鼠點擊只會開啟，不會把 hover 開的框又關掉）；觸控裝置點一下開、再點一下關
  const hover = (v: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setOpen(v);
  };

  return (
    <span ref={wrapRef} className={[styles.wrap, className].filter(Boolean).join(" ")}
      onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
      <IconButton icon="info" label={label} aria-expanded={open} aria-describedby={open ? id : undefined}
        onPointerDown={(e) => { pointer.current = e.pointerType; }}
        onClick={() => setOpen((v) => (pointer.current === "mouse" ? true : !v))} />
      {/* 掛到 body：卡片的毛玻璃（backdrop-filter）會讓 fixed 定位失準，所以不放在卡片裡 */}
      {open && createPortal(
        <div ref={boxRef} id={id} role="tooltip" className={styles.popover}
          style={pos ? { top: pos.top, left: pos.left, transformOrigin: `${pos.origin}px 0` } : { visibility: "hidden" }}>
          {children}
        </div>,
        document.body,
      )}
    </span>
  );
}
