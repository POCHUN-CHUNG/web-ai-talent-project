import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "./api";

type AuthState = { username: string | null; loading: boolean; setUsername: (u: string | null) => void };
const Ctx = createContext<AuthState>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 每次載入頁面（含輸入網址、書籤）都向後端確認登入狀態
  useEffect(() => {
    api<{ username: string }>("/auth/me")
      .then((u) => setUsername(u.username))
      .catch(() => setUsername(null))
      .finally(() => setLoading(false));
  }, []);

  return <Ctx.Provider value={{ username, loading, setUsername }}>{children}</Ctx.Provider>;
}

export function RequireAuth() {
  const { username, loading } = useAuth();
  if (loading) return null;
  return username ? <Outlet /> : <Navigate to="/login" replace />;
}
