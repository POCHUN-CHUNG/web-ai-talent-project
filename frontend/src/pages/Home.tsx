import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

// 【首頁】登入後看到的畫面，顯示歡迎詞、設定連結與登出按鈕。無參數。
export default function Home() {
  const { username, setUsername } = useAuth();
  const navigate = useNavigate();

  // 【登出】按下登出鈕時執行
  async function logout() {
    // 1. 通知後端讓通行證失效（失敗也不影響）
    await api("/auth/logout", {}).catch(() => {});
    // 2. 清除前端的登入資訊
    setUsername(null);
    // 3. 回到登入頁
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>診股整股-投資組合量化風險分析平台</h1>
      <p>歡迎，{username}</p>
      <Link to="/settings">使用者設定</Link> <button onClick={logout}>登出</button>
    </div>
  );
}
