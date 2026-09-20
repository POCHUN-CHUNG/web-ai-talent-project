import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";

export default function Settings() {
  const { username } = useAuth();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/auth/change-password", { old_password: oldPw, new_password: newPw });
      setOldPw("");
      setNewPw("");
      setMsg({ ok: true, text: "密碼已更新" });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "無法連線，請稍後再試" });
    }
  }

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 320, margin: "10vh auto" }}>
      <h1>使用者設定</h1>
      <p>帳號：{username}</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input type="password" placeholder="舊密碼" value={oldPw} onChange={(e) => setOldPw(e.target.value)}
          maxLength={128} autoComplete="current-password" required />
        <input type="password" placeholder="新密碼（僅限英文與數字）" value={newPw} onChange={(e) => setNewPw(e.target.value)}
          maxLength={128} autoComplete="new-password" required />
        {msg && <div role="alert" style={{ color: msg.ok ? "green" : "crimson" }}>{msg.text}</div>}
        <button>修改密碼</button>
      </form>
      <p><Link to="/">回首頁</Link></p>
    </main>
  );
}
