import styles from "./RiskProfileGateModal.module.css";

// 【風險屬性守門提示】仿 macOS 系統 Alert 樣式的提示視窗：使用者直接輸入網址或點分頁想進入其他功能，
// 但尚未填過問卷時彈出；可按「取消」關閉留在本頁，或按「開始評估」前往問卷。
// 參數：onStart=按下「開始評估」時執行、onCancel=按下「取消」時執行
export default function RiskProfileGateModal({ onStart, onCancel }: { onStart: () => void; onCancel: () => void }) {
  return (
    <div className={styles.scrim} role="presentation">
      <div
        className={styles.alert}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="riskGateTitle"
        aria-describedby="riskGateMessage"
      >
        <h2 id="riskGateTitle" className={styles.title}>
          尚未完成風險屬性評估
        </h2>
        <p id="riskGateMessage" className={styles.message}>
          請先完成風險屬性評估，即可探索所有系統功能。
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            取消
          </button>
          <button type="button" className={styles.startButton} onClick={onStart}>
            開始評估
          </button>
        </div>
      </div>
    </div>
  );
}
