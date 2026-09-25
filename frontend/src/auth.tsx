import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "./api";

// 風險屬性狀態：none=從未填問卷、ready=可進入後續流程、limited=作答有衝突須回問卷修正
export type ProfileState = "none" | "ready" | "limited";
// 全站共用的登入資訊：username=帳號（未登入為 null）、loading=確認中、setUsername=更新帳號、
// profile=風險屬性狀態、refreshProfile=重新向後端確認風險屬性狀態
type AuthState = {
  username: string | null;
  loading: boolean;
  setUsername: (u: string | null) => void;
  profile: ProfileState;
  refreshProfile: () => Promise<void>;
};
const Ctx = createContext<AuthState>(null!);
// 【取得登入資訊】任何頁面呼叫後即可讀到目前帳號
export const useAuth = () => useContext(Ctx);

// 【登入狀態提供者】包住整個網站，讓所有頁面共用登入資訊。
// 參數：children=被包住的頁面
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileState>("none");

  // 【重新確認風險屬性狀態】取最新一份風險屬性：有就記下 readiness，查無（404）視為 none
  const refreshProfile = useCallback(async () => {
    try {
      const p = await api<{ readiness: string }>("/risk-profiles/latest");
      setProfile(p.readiness === "ready" ? "ready" : "limited");
    } catch {
      setProfile("none");
    }
  }, []);

  // 每次載入頁面（含輸入網址、書籤）都向後端確認登入狀態
  useEffect(() => {
    api<{ username: string; hasRiskProfile: boolean }>("/auth/me")
      .then(async (u) => {
        setUsername(u.username); // 已登入：記下帳號
        if (u.hasRiskProfile) await refreshProfile(); // 有風險屬性才需要查是否被擋住
      })
      .catch(() => setUsername(null)) // 未登入：清空
      .finally(() => setLoading(false)); // 確認完畢
  }, [refreshProfile]);

  return <Ctx.Provider value={{ username, loading, setUsername, profile, refreshProfile }}>{children}</Ctx.Provider>;
}

// 【登入守衛】保護需登入的頁面，無參數。
export function RequireAuth() {
  const { username, loading } = useAuth();
  // 1. 還在確認登入狀態：先不顯示，避免畫面閃動
  if (loading) return null;
  // 2. 已登入顯示頁面，未登入導向登入頁
  return username ? <Outlet /> : <Navigate to="/login" replace />;
}

// 【風險屬性守衛】保護後續功能頁，無參數：尚未填問卷，或作答有衝突（limited）時，一律導回風險屬性頁
// （尚未填過會在該頁看到「開始評估」引導，並跳出強制提示視窗；作答有衝突則由該頁再導去問卷修正）。
// 帶 blocked 記號，讓風險屬性頁知道這是被擋下來的，才需要跳出提示視窗（直接切到這頁查看則不用）。
export function RequireProfile() {
  const { profile } = useAuth();
  return profile === "ready" ? <Outlet /> : <Navigate to="/risk-profile" state={{ blocked: true }} replace />;
}
