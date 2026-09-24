import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useTheme } from "../../theme";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import styles from "./TopBar.module.css";

// 【入口頁頂列】固定在頁面最上方，左邊放系統 logo，右邊放深色模式切換與帳戶選單。無參數。
export default function TopBar() {
  const navigate = useNavigate();
  const { username, setUsername } = useAuth();
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  const [menuOpen, setMenuOpen] = useState(false); // 帳戶選單是否展開
  const menuRef = useRef<HTMLDivElement>(null);

  // 點選選單以外的地方時自動收起選單
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  // 【切換深色模式】按下圖示時執行，立刻套用並記住選擇（其他用到主題的元件會同步更新）。無參數。
  function toggleTheme() {
    setTheme(dark ? "light" : "dark");
  }

  // 【前往設定】收起選單並導向設定頁。無參數。
  function goSettings() {
    setMenuOpen(false);
    navigate("/settings");
  }

  // 【登出】通知後端讓通行證失效，清除登入狀態後導向登入頁。無參數。
  async function logout() {
    setMenuOpen(false);
    await api("/auth/logout", {}).catch(() => {});
    setUsername(null);
    navigate("/login", { replace: true });
  }

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <Icon name="query_stats" size={22} />
        </div>
        <div className={styles.actions}>
          <IconButton icon={dark ? "light_mode" : "dark_mode"} label="切換深淺模式" onClick={toggleTheme} />
          <div className={styles.menuWrap} ref={menuRef}>
            <IconButton icon="person" label="帳戶" onClick={() => username && setMenuOpen((v) => !v)} />
            {menuOpen && (
              <div className={styles.menu} role="menu">
                <button type="button" role="menuitem" className={styles.menuItem} onClick={goSettings}>
                  設定
                </button>
                <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={logout}>
                  登出
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
