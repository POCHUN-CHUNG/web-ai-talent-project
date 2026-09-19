import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";

export default function Landing({ mode }: { mode: "login" | "register" }) {
  const { username, setUsername } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (username) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await api<{ username: string }>(`/auth/${mode}`, { username: account, password });
      setUsername(u.username);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "無法連線，請稍後再試");
    } finally {
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
