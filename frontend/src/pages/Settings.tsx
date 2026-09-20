import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";

// 【使用者設定頁】顯示帳號並提供修改密碼。無參數。
export default function Settings() {
  const { username } = useAuth();
  const [oldPw, setOldPw] = useState(""); // 輸入的舊密碼
  const [newPw, setNewPw] = useState(""); // 輸入的新密碼
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); // 結果訊息（ok=是否成功）

  // 【送出修改】按下修改密碼鈕時執行。
  // 參數：e=表單事件
  async function submit(e: FormEvent) {
    // 1. 阻止網頁預設的重新整理，並清除舊訊息
    e.preventDefault();
    setMsg(null);
    try {
      // 2. 把新舊密碼送給後端
      await api("/auth/change-password", { old_password: oldPw, new_password: newPw });
      // 3. 成功：清空輸入欄並提示
      setOldPw("");
      setNewPw("");
      setMsg({ ok: true, text: "密碼已更新" });
    } catch (err) {
      // 4. 失敗：顯示後端說明，連不上則顯示通用訊息
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
