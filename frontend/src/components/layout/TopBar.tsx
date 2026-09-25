import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import styles from "./TopBar.module.css";

// 【入口頁頂列】固定在頁面最上方，左邊放系統 logo（登入後才顯示文字），右邊放帳戶選單。只有登入後才會顯示，登入／註冊頁不顯示。無參數。
export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, setUsername } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false); // 帳戶選單是否展開
  const menuRef = useRef<HTMLDivElement>(null);
  const tabsWrapRef = useRef<HTMLDivElement>(null); // 分頁列容器，量測用的定位基準
  const tabRefs = useRef(new Map<string, HTMLButtonElement>()); // 各分頁按鈕，key 為路徑
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null); // 滑動指示條的位置與寬度
  const [pressed, setPressed] = useState(false); // 剛點擊分頁的短暫「放大」瞬間
  const pressTimer = useRef<number | undefined>(undefined);

  const tabs = [
    { name: "風險屬性", path: "/risk-profile", icon: "shield_person" },
    { name: "投資組合", path: "/portfolios", icon: "pie_chart" },
    { name: "風險分析", path: "/analysis", icon: "analytics" },
    { name: "歷史紀錄", path: "/history", icon: "history" }
  ];

  // 【是否為作用中分頁】路徑相同即是；問卷頁屬於「風險屬性」分頁。參數：path=分頁路徑
  const isActiveTab = (path: string) =>
    location.pathname === path || (path === "/risk-profile" && location.pathname === "/questionnaire");

  // 【量測滑動指示條】找出目前作用中的分頁按鈕，算出它相對分頁列容器的位置與寬度。無參數。
  function measureIndicator() {
    const activeTab = tabs.find((t) => isActiveTab(t.path));
    const wrap = tabsWrapRef.current;
    const activeButton = activeTab ? tabRefs.current.get(activeTab.path) : undefined;
    if (!wrap || !activeButton) {
      setIndicator(null);
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    const btnRect = activeButton.getBoundingClientRect();
    setIndicator({ left: btnRect.left - wrapRect.left - wrap.clientLeft, width: btnRect.width });
  }

  // 分頁切換時（含瀏覽器上一頁／下一頁）重新定位指示條；畫面尺寸改變時也要重算
  useLayoutEffect(() => {
    measureIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  useEffect(() => {
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
  });
  // 卸載時清掉還沒觸發的「放大」計時器，避免記憶體洩漏
  useEffect(() => () => window.clearTimeout(pressTimer.current), []);

  // 【切換分頁】指示條先放大一下（像液態玻璃被按下去的感覺）再滑到新分頁的位置；
  // 這裡刻意不用 View Transitions API 讓整頁淡入淡出，只換頁面內容本身，指示條才會是純粹的滑動、不會被整頁的過場蓋掉。
  // 參數：path=目的地路徑
  function goTab(path: string) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      window.clearTimeout(pressTimer.current);
      setPressed(true);
      pressTimer.current = window.setTimeout(() => setPressed(false), 180);
    }
    navigate(path);
  }

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
      <div className={styles.barBackground} aria-hidden="true" />
      <div className={styles.inner}>
        <div
          className={`${styles.brand} ${styles.brandClickable}`}
          onClick={() => navigate("/portfolios")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/portfolios")}
          role="link"
          tabIndex={0}
        >
          <div className={styles.logo}>
            <Icon name="query_stats" size={22} />
          </div>
          <span className={styles.brandText}>診股整股</span>
        </div>

        {/* 中央標籤列：indicator 是跟著作用中分頁滑動的玻璃指示條 */}
        <div className={styles.tabsWrap} ref={tabsWrapRef}>
          {indicator && (
            <div
              className={`${styles.indicator} ${pressed ? styles.indicatorPressed : ""}`}
              style={{
                // translate 負責滑動位置、scale 負責按壓放大，各自獨立的屬性才能給不同的過渡時間
                translate: `${indicator.left}px`,
                scale: pressed ? 1.16 : 1,
                width: `${indicator.width}px`
              }}
              aria-hidden="true"
            />
          )}
          {tabs.map((tab) => {
            const isActive = isActiveTab(tab.path);
            return (
              <button
                key={tab.path}
                type="button"
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.path, el);
                  else tabRefs.current.delete(tab.path);
                }}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => goTab(tab.path)}
              >
                <Icon name={tab.icon} className={styles.tabIcon} size={28} /><span className={styles.tabText}>{tab.name}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <div className={styles.menuWrap} ref={menuRef}>
            <IconButton icon="person" label="帳戶" onClick={() => setMenuOpen((v) => !v)} className={styles.userIcon} iconSize={22} />
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
