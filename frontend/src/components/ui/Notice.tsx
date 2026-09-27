import { HTMLAttributes } from "react";
import Icon from "./Icon";
import styles from "./Notice.module.css";

type Props = HTMLAttributes<HTMLDivElement> & {
  icon?: string; // 開頭圖示，預設 info（DESIGN.md：提示語前面一律加對應圖示）
};

// 【提示框】液態玻璃風格的提示語／警語（投資組合、組合詳情、風險屬性頁共用），圖示與文字皆為中性色。
// 參數：icon=開頭圖示（預設 info）、children=提示文字，其餘同原生 <div>
export default function Notice({ icon = "info", className, children, ...rest }: Props) {
  return (
    <div className={[styles.notice, className].filter(Boolean).join(" ")} {...rest}>
      <Icon name={icon} size={24} />
      <span>{children}</span>
    </div>
  );
}
