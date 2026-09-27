import { ReactNode, useEffect, useRef } from "react";
import styles from "./Modal.module.css";

type Props = {
  title: string; // 視窗標題
  onCancel?: () => void; // 按 Esc 時執行，等同按下視窗的「取消」（單一按鈕的提示視窗則等同「關閉」）
  children: ReactNode; // 內容（表單欄位與下方按鈕列都放在這裡）
};

// 【彈出視窗】全站唯一的彈出視窗外框（DESIGN.md「Modal / sheet」），液態玻璃風格：
// 1. 模糊遮罩在頂端列與手機底部導覽列「下方」（兩者維持清晰）；另一層透明的操作層蓋住整個畫面（含頂端列），
//    所以視窗開著時背景完全不能操作：不能點頂端列、不能捲動頁面，只能操作視窗本身（不使用原生 <dialog> 的最上層）。
// 2. 桌機寬度固定 450px（手機依螢幕寬度縮小）。
// 3. 右上角不放關閉鈕；點遮罩、點視窗空白處都不會關閉，只能按視窗內的按鈕關閉；按 Esc 等同按「取消」。
// 參數：title=標題、onCancel=按 Esc 時執行（可省略）、children=內容（呼叫端自己放按鈕，按鈕列用 Modal.module.css 的 actions）
export default function Modal({ title, onCancel, children }: Props) {
  const cancelRef = useRef(onCancel); // 永遠指向最新的 onCancel，監聽器只需註冊一次
  cancelRef.current = onCancel;

  // 按 Esc 等同按「取消」
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") cancelRef.current?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // 視窗開著時鎖住背景捲動，關閉時還原
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, []);

  return (
    <>
      {/* 模糊遮罩：在頂端列下方，只負責視覺 */}
      <div className={styles.scrim} aria-hidden="true" />
      {/* 操作層：透明、蓋住整個畫面（含頂端列），攔下背景的點擊與捲動；視窗放在這一層置中 */}
      <div className={styles.layer} onWheel={(e) => e.stopPropagation()}>
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
