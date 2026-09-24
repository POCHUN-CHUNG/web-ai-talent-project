import { ReactNode } from "react";
import TopBar from "./TopBar";
import Footer from "./Footer";
import styles from "./EntryPage.module.css";

// 【入口頁版面】登入、註冊、設定頁共用：頂列（logo＋帳戶）、斜角暈染背景、置中內容、貼底的版權宣告。
// 參數：children=卡片與其餘置中內容、showTopBar=是否顯示頂列、showFooter=是否顯示版權宣告
// （兩者預設顯示；若外層已用 TabsLayout 提供頂列／版權宣告則傳 false，避免重複）
export default function EntryPage({ children, showTopBar = true, showFooter = true }: { children: ReactNode; showTopBar?: boolean; showFooter?: boolean }) {
  return (
    <div className={styles.wrap}>
      {showTopBar && <TopBar />}
      <main className={styles.main}>{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
