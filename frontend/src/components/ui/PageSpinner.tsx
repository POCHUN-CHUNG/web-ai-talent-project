import styles from "./PageSpinner.module.css";

// 【頁面載入中】整頁資料還沒回來時顯示的轉圈圈：固定在「扣除頂端列（手機另扣下方分頁列）後的可視區域」正中間，
// 頁面本身只保留標題（見 DESIGN.md〈Page loading〉）。參數：label=給螢幕報讀的說明（預設「載入中」）
export default function PageSpinner({ label = "載入中" }: { label?: string }) {
  return (
    <div className={styles.area} role="status" aria-label={label}>
      <svg className={styles.spinner} viewBox="0 0 50 50" aria-hidden="true">
        <circle className={styles.head} cx="25" cy="25" r="20" fill="none" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
