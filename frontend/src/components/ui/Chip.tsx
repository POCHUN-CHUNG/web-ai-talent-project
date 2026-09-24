import { HTMLAttributes } from "react";
import Icon from "./Icon";
import styles from "./Chip.module.css";

type Variant = "error" | "success" | "warning" | "info";
const DEFAULT_ICON: Record<Variant, string> = { error: "error", success: "check_circle", warning: "warning", info: "info" };

type Props = HTMLAttributes<HTMLDivElement> & {
  variant: Variant; // 狀態種類，決定顏色與預設圖示
  icon?: string; // 覆寫預設圖示
};

// 【狀態提示 Chip】依 DESIGN.md 的 status chip 元件 token（*-container 底色 + on-*-container 文字）。
// 參數：variant=狀態種類、icon=覆寫預設圖示，其餘同原生 <div>
export default function Chip({ variant, icon, className, children, ...rest }: Props) {
  return (
    <div role="alert" className={[styles.chip, styles[variant], className].filter(Boolean).join(" ")} {...rest}>
      <Icon name={icon ?? DEFAULT_ICON[variant]} size={17} />
      <span>{children}</span>
    </div>
  );
}
