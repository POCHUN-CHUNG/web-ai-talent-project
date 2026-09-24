import { ReactNode, useEffect } from "react";
import IconButton from "./IconButton";
import styles from "./Modal.module.css";

type Props = {
  title: string; // 視窗標題
  onClose: () => void; // 點擊遮罩、按 Esc 或按右上角關閉鈕時執行
  children: ReactNode; // 內容（表單欄位與下方按鈕列都放在這裡）
};

// 【彈出視窗】液態玻璃風格：背景整塊模糊＋半透明（頂端 Tab 列的 z-index 較高，維持清晰不受影響），
// 右上角固定關閉鈕，點視窗以外的地方或按 Esc 也會關閉。
// 參數：title=標題、onClose=關閉時執行、children=內容
export default function Modal({ title, onClose, children }: Props) {
  // 按 Esc 鍵等同點擊遮罩關閉
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.scrim} onClick={onClose}>
      {/* 擋掉冒泡：點視窗本體不應該觸發遮罩的關閉事件 */}
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <IconButton icon="close" label="關閉" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
