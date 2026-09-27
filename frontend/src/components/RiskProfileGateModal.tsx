import Button from "./ui/Button";
import Modal from "./ui/Modal";
import modalStyles from "./ui/Modal.module.css";
import styles from "./RiskProfileGateModal.module.css";

// 【風險屬性守門提示】使用者直接輸入網址或點分頁想進入其他功能，但尚未填過問卷時彈出；
// 使用共用的 Modal 外框（不蓋住頂端列、桌機寬 450px、只能按按鈕關閉，Esc 等同「取消」），可按「取消」留在本頁，或按「開始填寫」前往問卷。
// 參數：onStart=按下「開始填寫」時執行、onCancel=按下「取消」時執行
export default function RiskProfileGateModal({ onStart, onCancel }: { onStart: () => void; onCancel: () => void }) {
  return (
    <Modal title="尚未完成風險屬性評估" onCancel={onCancel}>
      <p className={styles.message}>請先完成風險屬性評估，即可探索所有系統功能。</p>
      <div className={modalStyles.actions}>
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button onClick={onStart} autoFocus>開始填寫</Button>
      </div>
    </Modal>
  );
}
