import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import styles from "./TopBar.module.css";

// 【入口頁頂列】固定在頁面最上方，左邊放系統 logo（登入後才顯示文字），右邊放帳戶選單。只有登入後才會顯示，登入／註冊頁不顯示。無參數。
export default function TopBar() {
  const navigate = useNavigate();
  const { username, setUsername } = useAuth();
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

  // 未登入（登入／註冊頁）不顯示整個頂列
  if (!username) return null;

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <div
          className={`${styles.brand} ${styles.brandClickable}`}
          onClick={() => navigate("/")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/")}
          role="link"
          tabIndex={0}
        >
          <div className={styles.logo}>
            <Icon name="query_stats" size={22} />
          </div>
          <span className={styles.brandText}>診股整股</span>
        </div>
        <div className={styles.actions}>
          <div className={styles.menuWrap} ref={menuRef}>
            <IconButton icon="person" label="帳戶" onClick={() => setMenuOpen((v) => !v)} />
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
