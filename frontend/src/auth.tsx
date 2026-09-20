import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "./api";

// 全站共用的登入資訊：username=帳號（未登入為 null）、loading=確認中、setUsername=更新帳號
type AuthState = { username: string | null; loading: boolean; setUsername: (u: string | null) => void };
const Ctx = createContext<AuthState>(null!);
// 【取得登入資訊】任何頁面呼叫後即可讀到目前帳號
export const useAuth = () => useContext(Ctx);

// 【登入狀態提供者】包住整個網站，讓所有頁面共用登入資訊。
// 參數：children=被包住的頁面
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 每次載入頁面（含輸入網址、書籤）都向後端確認登入狀態
  useEffect(() => {
    api<{ username: string }>("/auth/me")
      .then((u) => setUsername(u.username)) // 已登入：記下帳號
      .catch(() => setUsername(null)) // 未登入：清空
      .finally(() => setLoading(false)); // 確認完畢
  }, []);

  return <Ctx.Provider value={{ username, loading, setUsername }}>{children}</Ctx.Provider>;
}

// 【登入守衛】保護需登入的頁面，無參數。
export function RequireAuth() {
  const { username, loading } = useAuth();
  // 1. 還在確認登入狀態：先不顯示，避免畫面閃動
  if (loading) return null;
  // 2. 已登入顯示頁面，未登入導向登入頁
  return username ? <Outlet /> : <Navigate to="/login" replace />;
}
