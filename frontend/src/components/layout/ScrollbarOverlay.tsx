import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ScrollbarOverlay.module.css";

// 【自訂捲軸】瀏覽器原生捲軸已經整個隱藏（見 global.css），改由這裡疊一條在畫面最上層自己畫的捲軸：
// 完全不佔版面寬度，所以切換「無捲動」跟「要捲動」的頁面時，內容寬度不會跳動；
// 支援拖曳滑塊捲動，滾輪／鍵盤／觸控捲動則直接用瀏覽器原生行為，這裡只負責畫面顯示。無參數。
export default function ScrollbarOverlay() {
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null);
  const dragRef = useRef<{ startY: number; startScrollY: number } | null>(null);

  // 【重新量測】依目前捲動高度與可視高度，算出滑塊的位置與長度；內容沒超出畫面就不顯示。無參數。
  const measure = useCallback(() => {
    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const maxScroll = scrollHeight - viewportHeight;
    if (maxScroll <= 1) {
      setThumb(null);
      return;
    }
    const thumbHeight = Math.max((viewportHeight / scrollHeight) * viewportHeight, 32); // 最短 32px，太短會抓不到
    const thumbTop = (window.scrollY / maxScroll) * (viewportHeight - thumbHeight);
    setThumb({ top: thumbTop, height: thumbHeight });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    // 內容高度變化（資料載入、展開/收合等）也要重新量測，不用等使用者捲動或縮放視窗才更新
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [measure]);

  // 【拖曳滑塊】按住滑塊拖曳時，依拖曳距離換算成捲動量。參數：e=指標按下事件
  function onThumbPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startScrollY: window.scrollY };
  }

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const maxScroll = scrollHeight - viewportHeight;
      const thumbHeight = Math.max((viewportHeight / scrollHeight) * viewportHeight, 32);
      const trackRange = viewportHeight - thumbHeight;
      if (trackRange <= 0) return;
      const scrollDelta = ((e.clientY - drag.startY) / trackRange) * maxScroll;
      window.scrollTo({ top: drag.startScrollY + scrollDelta });
    }
    function onPointerUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  if (!thumb) return null;

  return (
    <div className={styles.track} aria-hidden="true">
      <div className={styles.thumb} style={{ top: thumb.top, height: thumb.height }} onPointerDown={onThumbPointerDown} />
    </div>
  );
}
