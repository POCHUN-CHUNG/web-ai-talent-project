import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import cardStyles from "../components/ui/Card.module.css";
import Chip from "../components/ui/Chip";
import IconButton from "../components/ui/IconButton";
import Input from "../components/ui/Input";
import EntryPage from "../components/layout/EntryPage";
import styles from "./Login.module.css";

// 【登入／註冊頁】同一個畫面，依 mode 切換。
// 參數：mode="login" 顯示登入、"register" 顯示註冊
export default function Login({ mode }: { mode: "login" | "register" }) {
  const { username, setUsername, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState(""); // 輸入的帳號
  const [password, setPassword] = useState(""); // 輸入的密碼
  const [confirmPassword, setConfirmPassword] = useState(""); // 輸入的確認密碼（僅註冊）
  const [showPassword, setShowPassword] = useState(false); // 密碼是否顯示明文
  const [error, setError] = useState(""); // 錯誤訊息
  const [busy, setBusy] = useState(false); // 送出中（避免重複點擊）

  const isRegister = mode === "register";

  // 已登入者不需停留此頁，直接回首頁
  if (username) return <Navigate to="/" replace />;

  // 【送出表單】按下登入／註冊鈕時執行。
  // 參數：e=表單事件
  async function submit(e: FormEvent) {
    // 1. 阻止網頁預設的重新整理，並清除舊錯誤
    e.preventDefault();
    setError("");
    // 2. 註冊時檢查兩次密碼是否一致，不合就不送出
    if (isRegister && password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    setBusy(true);
    try {
      // 3. 把帳密送給後端
      const u = await api<{ username: string }>(`/auth/${mode}`, { username: account, password });
      // 4. 成功：記下帳號並前往首頁
      setUsername(u.username);
      await refreshProfile(); // 確認這個帳號是否已有風險屬性，才能決定導向首頁或問卷
      navigate("/", { replace: true });
    } catch (err) {
      // 5. 失敗：顯示後端說明，連不上則顯示通用訊息
      setError(err instanceof ApiError ? err.message : "無法連線，請稍後再試");
    } finally {
      // 6. 結束送出中
      setBusy(false);
    }
  }

  return (
    <EntryPage>
      <Card className={`${styles.card} ${cardStyles.entryBlur}`}>
        <div className={styles.brand}>
          <h1 className={styles.brandTitle}>診 股 整 股</h1>
          <p className={styles.brandSubtitle}>投資組合量化風險分析平台</p>
        </div>
        <h2 className={styles.formHeading}>{isRegister ? "註冊" : "登入"}</h2>
        <form className={styles.form} onSubmit={submit}>
          <Input
            id="accountInput"
            label="帳號"
            placeholder="請輸入帳號"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            maxLength={32}
            autoComplete="username"
            required
          />
          <Input
            id="passwordInput"
            label="密碼"
            type={showPassword ? "text" : "password"}
            placeholder="請輸入密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={128}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            endAdornment={
              <IconButton
                icon={showPassword ? "visibility_off" : "visibility"}
                label="切換密碼顯示"
                onClick={() => setShowPassword((v) => !v)}
              />
            }
          />
          {isRegister && (
            <Input
              id="confirmPasswordInput"
              label="確認密碼"
              type={showPassword ? "text" : "password"}
              placeholder="請再次輸入密碼"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          )}
          <Button type="submit" busy={busy} fullWidth>
            {busy ? "處理中" : isRegister ? "註冊" : "登入"}
          </Button>
          {error && <Chip variant="error">{error}</Chip>}
        </form>
        <p className={styles.switchRow}>
          {isRegister ? "已有帳號？" : "還沒有帳號？"}
          <button type="button" className={styles.switchLink} onClick={() => navigate(isRegister ? "/login" : "/register")}>
            {isRegister ? "登入" : "註冊"}
          </button>
        </p>
      </Card>
      <p className={styles.footer}>© 2026 診股整股 All Rights Reserved.</p>
    </EntryPage>
  );
}
