import { useNavigate } from "react-router-dom";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import { useTheme } from "../../theme";
import styles from "./TopBar.module.css";

// 【入口頁頂列】固定在頁面最上方，左邊放系統 logo，右邊放深色模式切換與帳戶圖示。無參數。
export default function TopBar() {
  const navigate = useNavigate();
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";

  // 【切換深色模式】按下圖示時執行，立刻套用並記住選擇（其他用到主題的元件會同步更新）。無參數。
  function toggleTheme() {
    setTheme(dark ? "light" : "dark");
  }

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <Icon name="query_stats" size={22} />
        </div>
        <div className={styles.actions}>
          <IconButton icon={dark ? "light_mode" : "dark_mode"} label="切換深淺模式" onClick={toggleTheme} />
          <IconButton icon="person" label="帳戶" onClick={() => navigate("/settings")} />
        </div>
      </div>
    </header>
  );
}
