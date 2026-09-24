import { HTMLAttributes } from "react";
import styles from "./Card.module.css";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: "glass" | "surface" | "nested"; // 卡片樣式，預設 glass（浮在暈染背景上的主卡）
};

// 【卡片】依 DESIGN.md 的 card／nested card 元件 token。
// 參數：variant=樣式（glass=玻璃卡、surface=不透明卡、nested=卡片內的巢狀卡），其餘同原生 <div>
export default function Card({ variant = "glass", className, children, ...rest }: Props) {
  return (
    <div className={[styles.card, styles[variant], className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
