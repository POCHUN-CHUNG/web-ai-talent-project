import Button from "./Button";
import Modal from "./Modal";
import modalStyles from "./Modal.module.css";
import styles from "./AlertDialog.module.css";

type Props = {
  open: boolean; // 是否顯示
  title: string; // 標題
  messages: string[]; // 內文，每個字串一段
  confirmLabel?: string; // 按鈕文字，預設「確認」
  onConfirm: () => void; // 按下按鈕後執行
};

// 【提示視窗】只有一顆按鈕的提示（例如問卷作答衝突、重新填寫的冷卻時間）。
// 使用共用的 Modal 外框：不蓋住頂端列與手機底部導覽列、桌機寬 450px、只能按按鈕或 Esc 關閉；開啟時焦點自動移到按鈕上，按 Enter 即可確認。
// 參數：open=是否顯示、title=標題、messages=內文段落、confirmLabel=按鈕文字、onConfirm=按下按鈕後執行
export default function AlertDialog({ open, title, messages, confirmLabel = "確認", onConfirm }: Props) {
  if (!open) return null;
  return (
    <Modal title={title} onCancel={onConfirm}>
      <div className={styles.message}>
        {messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
      </div>
      <div className={modalStyles.actions}>
        <Button onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
