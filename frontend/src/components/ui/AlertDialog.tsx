import { useEffect, useRef } from "react";
import styles from "./AlertDialog.module.css";

type Props = {
  open: boolean; // 是否顯示
  title: string; // 標題
  messages: string[]; // 內文，每個字串一段
  confirmLabel?: string; // 按鈕文字，預設「確認」
  onConfirm: () => void; // 按下按鈕或按 Esc 關閉後執行
};

// 【提示視窗】只有一顆確認按鈕的提示（例如問卷作答衝突）。使用原生 <dialog>：開啟時焦點鎖在視窗內，
// 按 Esc 等同按下確認；關閉時呼叫 onConfirm，讓呼叫端接著做捲動等後續動作。
// 參數：open=是否顯示、title=標題、messages=內文段落、confirmLabel=按鈕文字、onConfirm=關閉後執行
export default function AlertDialog({ open, title, messages, confirmLabel = "確認", onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const onConfirmRef = useRef(onConfirm); // 永遠指向最新的 onConfirm，監聽器只需註冊一次
  onConfirmRef.current = onConfirm;
  const confirmedRef = useRef(false); // 已由按鈕處理過，避免之後的 close 事件再呼叫一次

  // 【按下確認】關閉視窗並立刻執行後續動作（不等 close 事件，瀏覽器在背景分頁時可能延後派送）。無參數。
  function confirm() {
    confirmedRef.current = true;
    ref.current?.close();
    onConfirmRef.current();
  }

  // 按 Esc 關閉時只會收到原生 close 事件：同樣視為確認；直接掛在元素上，不依賴 React 是否轉送這個事件
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      if (confirmedRef.current) {
        confirmedRef.current = false;
        return;
      }
      onConfirmRef.current();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  // 依 open 開關原生 dialog（showModal 會放到最上層並鎖定焦點）
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="alertDialogTitle">
      <div className={styles.body}>
        <h2 id="alertDialogTitle" className={styles.title}>
          {title}
        </h2>
        <div className={styles.message}>
          {messages.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
        <button type="button" className={styles.action} onClick={confirm} autoFocus>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
