import { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outlined" | "danger"; // 按鈕樣式，預設 primary；danger 用於登出等危險操作
  busy?: boolean; // 處理中：顯示轉圈圈並停用
  fullWidth?: boolean; // 是否撐滿容器寬度
};

// 【按鈕】依 DESIGN.md 的 button 元件 token（25px 圓角、label-lg 字級）。
// 參數：variant=樣式、busy=是否處理中、fullWidth=是否撐滿寬度，其餘同原生 <button>
export default function Button({ variant = "primary", busy, fullWidth, disabled, children, className, ...rest }: Props) {
  const cls = [styles.button, styles[variant], fullWidth ? styles.fullWidth : "", className].filter(Boolean).join(" ");
  return (
    <button className={cls} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy && (
        <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
          <path
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
            opacity="0.75"
          />
        </svg>
      )}
      <span>{children}</span>
    </button>
  );
}
