import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "theme"; // localStorage 鍵名，記住使用者手動選擇的主題
const listeners = new Set<(t: Theme) => void>(); // 同一頁面內所有用到主題的元件，切換時互相通知

// 【讀取目前主題】沒有手動選擇過就照系統偏好。無參數。
function readTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// 【套用並記住主題】寫入 <html data-theme> 讓 tokens.css 套用對應色票，同時存進 localStorage、通知其他元件。
// 參數：theme=要套用的主題
export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
  listeners.forEach((fn) => fn(theme));
}

// 【主題狀態】任何元件都能訂閱目前主題，且切換時（不論從哪個元件切換）所有訂閱者會同步更新。無參數。
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  useEffect(() => {
    listeners.add(setThemeState);
    return () => {
      listeners.delete(setThemeState);
    };
  }, []);
  return [theme, setTheme];
}
