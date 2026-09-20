import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Home() {
  const { username, setUsername } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await api("/auth/logout", {}).catch(() => {});
    setUsername(null);
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
