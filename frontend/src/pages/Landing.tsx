import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";

// 【登入／註冊頁】同一個畫面，依 mode 切換。
// 參數：mode="login" 顯示登入、"register" 顯示註冊
export default function Landing({ mode }: { mode: "login" | "register" }) {
  const { username, setUsername } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState(""); // 輸入的帳號
  const [password, setPassword] = useState(""); // 輸入的密碼
  const [error, setError] = useState(""); // 錯誤訊息
  const [busy, setBusy] = useState(false); // 送出中（避免重複點擊）

  // 已登入者不需停留此頁，直接回首頁
  if (username) return <Navigate to="/" replace />;

  // 【送出表單】按下登入／註冊鈕時執行。
  // 參數：e=表單事件
  async function submit(e: FormEvent) {
    // 1. 阻止網頁預設的重新整理，並清除舊錯誤、進入送出中
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // 2. 把帳密送給後端
      const u = await api<{ username: string }>(`/auth/${mode}`, { username: account, password });
      // 3. 成功：記下帳號並前往首頁
      setUsername(u.username);
      navigate("/", { replace: true });
    } catch (err) {
      // 4. 失敗：顯示後端說明，連不上則顯示通用訊息
      setError(err instanceof ApiError ? err.message : "無法連線，請稍後再試");
    } finally {
      // 5. 結束送出中
      setBusy(false);
    }
  }

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 320, margin: "10vh auto" }}>
      <h1>{mode === "login" ? "登入" : "註冊"}</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input placeholder="帳號" value={account} onChange={(e) => setAccount(e.target.value)}
          maxLength={32} autoComplete="username" required />
        <input placeholder="密碼" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
        {error && <div role="alert" style={{ color: "crimson" }}>{error}</div>}
        <button disabled={busy}>{mode === "login" ? "登入" : "註冊"}</button>
      </form>
      <p>
        {mode === "login" ? <Link to="/register">還沒有帳號？註冊</Link> : <Link to="/login">已有帳號？登入</Link>}
      </p>
    </main>
  );
}
