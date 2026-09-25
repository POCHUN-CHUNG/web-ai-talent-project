import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // 確認密碼是否顯示明文（與密碼欄位各自獨立）
  const [error, setError] = useState(""); // 錯誤訊息
  const [busy, setBusy] = useState(false); // 送出中（避免重複點擊）

  const isRegister = mode === "register";

  // 已登入者不需停留此頁，直接回首頁
  if (username) return <Navigate to="/" replace />;

  // 【送出表單】按下登入／註冊鈕時執行。
  // 參數：e=表單事件
  async function submit(e: FormEvent) {
    // 1. 阻止網頁預設的重新整理與瀏覽器原生的必填提示框，並清除舊錯誤
    e.preventDefault();
    setError("");
    // 2. 必填欄位檢查（取代瀏覽器原生提示框，改用跟後端錯誤一致的樣式顯示）
    if (!account || !password || (isRegister && !confirmPassword)) {
      setError("請完整填寫帳號與密碼");
      return;
    }
    // 3. 註冊時檢查密碼格式（僅限英文與數字）與兩次密碼是否一致
    if (isRegister && !/^[A-Za-z0-9]+$/.test(password)) {
      setError("密碼僅限英文與數字");
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    setBusy(true);
    try {
      // 4. 把帳密送給後端
      const u = await api<{ username: string }>(`/auth/${mode}`, { username: account, password });
      // 5. 成功：先確認這個帳號是否已有風險屬性，再同時記下帳號與換頁（兩者同一次更新，
      //    避免本頁先因「已登入」自己導回首頁，讓新帳號被當成「被擋下」而跳出提示視窗）
      await refreshProfile();
      setUsername(u.username);
      // 註冊：新帳號一定還沒評估，直接到風險屬性頁看「開始評估」引導（不跳提示視窗）；
      // 登入：回首頁，有風險屬性就進投資組合，沒有則由守衛導回風險屬性頁並跳出提示
      navigate(isRegister ? "/risk-profile" : "/", { replace: true });
    } catch (err) {
      // 6. 失敗：顯示後端說明，連不上則顯示通用訊息
      setError(err instanceof ApiError ? err.message : "無法連線，請稍後再試");
    } finally {
      // 7. 結束送出中
      setBusy(false);
    }
  }

  return (
    <EntryPage>
      <Card className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandInner}>
            <h1 className={styles.brandTitle}>診股整股</h1>
            <p className={styles.brandSubtitle}>投資組合量化風險分析平台</p>
          </div>
        </div>
        <h2 className={styles.formHeading}>{isRegister ? "註冊" : "登入"}</h2>
        <form className={styles.form} onSubmit={submit} noValidate>
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
            label={isRegister ? "密碼（僅限英文與數字）" : "密碼"}
            type={showPassword ? "text" : "password"}
            placeholder="請輸入密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={128}
            pattern={isRegister ? "^[A-Za-z0-9]+$" : undefined}
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
              type={showConfirmPassword ? "text" : "password"}
              placeholder="請再次輸入密碼"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              maxLength={128}
              pattern="^[A-Za-z0-9]+$"
              autoComplete="new-password"
              required
              endAdornment={
                <IconButton
                  icon={showConfirmPassword ? "visibility_off" : "visibility"}
                  label="切換確認密碼顯示"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                />
              }
            />
          )}
          <Button type="submit" busy={busy} fullWidth className={styles.submitButton}>
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
    </EntryPage>
  );
}
