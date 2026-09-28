import { ButtonHTMLAttributes } from "react";
import Icon from "./Icon";
import styles from "./IconButton.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string; // Material Symbols 圖示名稱
  label: string; // aria-label，圖示按鈕沒有文字，螢幕閱讀器需要這個說明
  iconSize?: number; // 圖示字級，預設 22px（DESIGN.md 統一規格，一般不需覆寫）
  compact?: boolean; // 放在輸入框內（如密碼顯示切換）時用的小尺寸：按鈕 32×32px、圖示 20px，滑過的底色才不會碰到輸入框外框
};

const ICON_SIZE = 22; // 圖示尺寸 22×22px（按鈕本身 40×40px，寫在 IconButton.module.css）
const COMPACT_ICON_SIZE = 20; // 輸入框內小尺寸按鈕的圖示 20×20px（按鈕 32×32px）

// 【圖示按鈕】圓形、無邊框，用於密碼顯示切換、編輯、刪除、關閉等只有一個圖示的操作；尺寸統一為按鈕 40×40px、圖示 22×22px。
// 例外：放在輸入框內的按鈕用 compact（32×32px、圖示 20px）。
// 參數：icon=圖示名稱、label=無障礙說明文字、iconSize=圖示字級、compact=輸入框內的小尺寸，其餘同原生 <button>
export default function IconButton({ icon, label, iconSize, compact, className, ...rest }: Props) {
  return (
    <button type="button" aria-label={label} className={[styles.iconButton, compact ? styles.compact : "", className].filter(Boolean).join(" ")} {...rest}>
      <Icon name={icon} size={iconSize ?? (compact ? COMPACT_ICON_SIZE : ICON_SIZE)} />
    </button>
  );
}
