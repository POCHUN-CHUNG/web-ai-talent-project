import { ReactNode } from "react";
import TopBar from "./TopBar";
import styles from "./EntryPage.module.css";

// 【入口頁版面】登入、註冊、設定頁共用：頂列（logo＋深色模式＋帳戶）、斜角暈染背景、置中內容、貼底的版權宣告。
// 參數：children=卡片與其餘置中內容、footer=貼在頁面最下方的內容（預設為版權宣告）
export default function EntryPage({ children, footer = "© 2026 診股整股 All Rights Reserved." }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <TopBar />
      <main className={styles.main}>{children}</main>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </div>
  );
}
