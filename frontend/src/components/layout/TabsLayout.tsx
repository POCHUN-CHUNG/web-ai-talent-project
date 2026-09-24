import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Footer from "./Footer";
import styles from "./TabsLayout.module.css";

// 【頂端 Tab 列共用外框】風險屬性、投資組合、設定等分頁共用：把 TopBar 放在路由外層，
// 讓分頁切換時 TopBar 不會被整個卸載重掛，滑動指示條的動畫才能接得上、視覺上才會順；
// 版權宣告固定貼在頁面下方（跟登入頁一樣）：內容短就貼齊畫面下緣，內容長則跟著捲動到最下面，不做固定定位。無參數。
export default function TabsLayout() {
  return (
    <div className={styles.wrap}>
      <TopBar />
      <div className={styles.content}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
