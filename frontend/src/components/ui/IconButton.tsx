import { ButtonHTMLAttributes } from "react";
import Icon from "./Icon";
import styles from "./IconButton.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string; // Material Symbols 圖示名稱
  label: string; // aria-label，圖示按鈕沒有文字，螢幕閱讀器需要這個說明
  iconSize?: number; // 覆寫預設字級
};

// 【圖示按鈕】圓形、無邊框，用於密碼顯示切換、主題切換等只有一個圖示的操作。
// 參數：icon=圖示名稱、label=無障礙說明文字，其餘同原生 <button>
export default function IconButton({ icon, label, iconSize, className, ...rest }: Props) {
  return (
    <button type="button" aria-label={label} className={[styles.iconButton, className].filter(Boolean).join(" ")} {...rest}>
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
