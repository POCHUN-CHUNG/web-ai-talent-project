import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Chip from "../components/ui/Chip";
import Icon from "../components/ui/Icon";
import IconButton from "../components/ui/IconButton";
import Input from "../components/ui/Input";
import Switch from "../components/ui/Switch";
import EntryPage from "../components/layout/EntryPage";
import { useTheme } from "../theme";
import styles from "./Settings.module.css";

// 【使用者設定頁】帳號資訊、修改密碼、深色模式切換。無參數。
export default function Settings() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [oldPw, setOldPw] = useState(""); // 輸入的舊密碼
  const [newPw, setNewPw] = useState(""); // 輸入的新密碼
  const [showOldPw, setShowOldPw] = useState(false); // 舊密碼是否顯示明文
  const [showNewPw, setShowNewPw] = useState(false); // 新密碼是否顯示明文
  const [busy, setBusy] = useState(false); // 送出中（避免重複點擊）
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); // 結果訊息（ok=是否成功）
  const [theme, setTheme] = useTheme(); // 目前主題（與頂列的切換鈕同步）
  const dark = theme === "dark";

  // 【送出修改】按下修改密碼鈕時執行。
  // 參數：e=表單事件
  async function submit(e: FormEvent) {
    // 1. 阻止網頁預設的重新整理與瀏覽器原生的必填提示框，並清除舊訊息
    e.preventDefault();
    setMsg(null);
    // 2. 必填與格式檢查（取代瀏覽器原生提示框，改用跟送出結果一致的樣式顯示）
    if (!oldPw || !newPw) {
      setMsg({ ok: false, text: "請輸入舊密碼與新密碼" });
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(newPw)) {
      setMsg({ ok: false, text: "新密碼僅限英文與數字" });
      return;
    }
    setBusy(true);
    try {
      // 3. 把新舊密碼送給後端
      await api("/auth/change-password", { old_password: oldPw, new_password: newPw });
      // 4. 成功：清空輸入欄並提示
      setOldPw("");
      setNewPw("");
      setMsg({ ok: true, text: "密碼已更新" });
    } catch (err) {
      // 5. 失敗：顯示後端說明，連不上則顯示通用訊息
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "無法連線，請稍後再試" });
    } finally {
      // 6. 結束送出中
      setBusy(false);
    }
  }

  // 【切換深色模式】按下開關時執行，立刻套用並記住選擇（頂列的切換鈕會同步更新）。
  // 參數：checked=切換後是否為深色模式
  function toggleTheme(checked: boolean) {
    setTheme(checked ? "dark" : "light");
  }

  return (
    <EntryPage>
      <Card className={styles.card}>
        <h1 className={styles.heading}>使用者設定</h1>

        <section>
          <p className={styles.sectionTitle}>帳號資訊</p>
          <Card variant="nested" className={styles.row}>
            <span className={styles.rowLabel}>帳號</span>
            <span className={styles.rowValue}>{username}</span>
          </Card>
        </section>

        <section>
          <p className={styles.sectionTitle}>修改密碼</p>
          <Card variant="nested">
            <form className={styles.form} onSubmit={submit} noValidate>
              <Input
                id="oldPasswordInput"
                label="舊密碼"
                type={showOldPw ? "text" : "password"}
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                maxLength={128}
                autoComplete="current-password"
                required
                endAdornment={
                  <IconButton icon={showOldPw ? "visibility_off" : "visibility"} label="切換舊密碼顯示" onClick={() => setShowOldPw((v) => !v)} />
                }
              />
              <Input
                id="newPasswordInput"
                label="新密碼（僅限英文與數字）"
                type={showNewPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                maxLength={128}
                pattern="^[A-Za-z0-9]+$"
                autoComplete="new-password"
                required
                endAdornment={
                  <IconButton icon={showNewPw ? "visibility_off" : "visibility"} label="切換新密碼顯示" onClick={() => setShowNewPw((v) => !v)} />
                }
              />
              <Button type="submit" busy={busy}>
                {busy ? "處理中" : "修改密碼"}
              </Button>
              {msg && <Chip variant={msg.ok ? "success" : "error"}>{msg.text}</Chip>}
            </form>
          </Card>
        </section>

        <section>
          <p className={styles.sectionTitle}>顯示設定</p>
          <Card variant="nested" className={styles.row}>
            <span className={styles.rowLabel}>深色模式</span>
            <Switch checked={dark} onChange={toggleTheme} label="切換深色模式" />
          </Card>
        </section>

        <button type="button" className={styles.backLink} onClick={() => navigate("/")}>
          <Icon name="arrow_back" size={16} />
          回首頁
        </button>
      </Card>
    </EntryPage>
  );
}
