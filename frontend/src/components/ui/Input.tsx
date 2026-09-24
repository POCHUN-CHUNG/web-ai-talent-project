import { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Input.module.css";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string; // 欄位上方的標籤文字
  endAdornment?: ReactNode; // 輸入框右側的附加元件（如密碼顯示切換鈕）
  error?: boolean; // 是否以錯誤樣式顯示邊框
};

// 【輸入框】依 DESIGN.md 的 input 元件 token（30px 圓角、1px outline 邊、focus 顯示 2px 焦點框）。
// 參數：label=標籤、endAdornment=右側附加元件、error=是否顯示錯誤邊框，其餘同原生 <input>
export default function Input({ label, id, endAdornment, error, className, ...rest }: Props) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          className={[styles.input, endAdornment ? styles.hasEndAdornment : "", error ? styles.error : "", className]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {endAdornment && <div className={styles.endAdornment}>{endAdornment}</div>}
      </div>
    </div>
  );
}
