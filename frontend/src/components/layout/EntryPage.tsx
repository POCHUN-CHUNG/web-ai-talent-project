import { ReactNode } from "react";
import TopBar from "./TopBar";
import styles from "./EntryPage.module.css";

// 【入口頁版面】登入、註冊、設定頁共用：頂列（logo＋深色模式＋帳戶）、斜角暈染背景、置中內容。
// 參數：children=卡片與其餘內容
export default function EntryPage({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <TopBar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
