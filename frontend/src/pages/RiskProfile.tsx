import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import LoadingOverlay from "../components/LoadingOverlay";
import CooldownModal from "../components/CooldownModal";

// 風險屬性（後端 GET /risk-profiles/latest 的內容）
type Profile = {
  id: number;
  readiness: string;
  coreIndicators: { lossTolerance: string; investmentHorizon: string; liquidityNeed: string; financialCapacity: string };
  facts: { id: string; label: string; valueText: string; availability: string; sourceQuestionIds: string[] }[];
  issues: { description: string }[];
  description: string | null;
  descriptionStatus: "pending" | "ready" | "failed";
  created: string;
};
const POLL_MS = 2000; // AI 描述尚未完成時，每 2 秒重取一次
const POLL_MAX = 60; // 最多等約 2 分鐘，之後停止等待

// 【格式化時間】把後端的 UTC 時間轉成使用者本地時間，格式 YYYY-MM-DD HH:MM:SS（精確到秒）。參數：iso=ISO 8601 時間字串
function formatTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 【風險屬性結果頁】問卷的結果畫面（剛填完或從首頁查看最新一份）：等 AI 描述完成後，一次顯示核心風險指標與風險屬性解析。
// 指標不可調整；等待期間只顯示「分析中」遮罩。尚未填問卷或作答有衝突時，導回問卷頁。無參數。
export default function RiskProfile() {
  const navigate = useNavigate();
  // 剛填完問卷送出而來（問卷頁帶的記號）：true 顯示「新增投資組合」；從首頁進來查看：false 顯示「重新填寫問卷」
  const state = useLocation().state as { justSubmitted?: boolean; cooldown?: number } | null;
  const justSubmitted = !!state?.justSubmitted;
  const [cooldown, setCooldown] = useState(state?.cooldown ?? 0); // 大於 0 時跳出「請稍後再填」視窗（剩餘秒數）
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false); // 從未填過問卷
  const [error, setError] = useState("");
  const [gaveUp, setGaveUp] = useState(false); // 等太久仍未產生描述
  const tries = useRef(0);
  const [pollKey, setPollKey] = useState(0); // 每按一次「重新產生」加 1，重新啟動輪詢
  const [regenError, setRegenError] = useState("");
  const [regenerating, setRegenerating] = useState(false); // 按了「重新產生」、等待結果中：只在解析區塊顯示「產生中…」，不出現「分析中」遮罩

  // 【載入並輪詢】取得最新風險屬性；描述仍是 pending 就隔 2 秒再取，直到完成或超過等待上限
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    async function load() {
      try {
        const p = await api<Profile>("/risk-profiles/latest");
        if (stopped) return;
        setProfile(p);
        if (p.descriptionStatus !== "pending") setRegenerating(false); // 已有結果（成功或失敗）：結束「產生中…」
        else if (++tries.current >= POLL_MAX) {
          setGaveUp(true);
          setRegenerating(false);
        } else timer = window.setTimeout(load, POLL_MS);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setMissing(true);
        else setError("無法載入風險屬性，請稍後再試");
      }
    }
    load();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [pollKey]);

  // 【重新產生】描述失敗時再要一次：成功送出後解析區塊顯示「產生中…」並輪詢等結果；太頻繁（429）等錯誤顯示在解析區塊下方
  async function regenerate() {
    if (!profile) return;
    setRegenError("");
    try {
      await api(`/risk-profiles/${profile.id}/regenerate-description`, {});
      // 成功送出：維持目前畫面，只把解析區塊改成「產生中…」，並重新輪詢等結果
      tries.current = 0;
      setGaveUp(false);
      setRegenerating(true);
      setPollKey((k) => k + 1);
    } catch (e) {
      setRegenError(e instanceof ApiError ? e.message : "無法連線，請稍後再試");
    }
  }

  // 【重新填寫】先問後端是否還在冷卻：是就跳視窗，不進問卷頁；否則前往問卷
  async function startRefill() {
    try {
      const r = await api<{ retryAfterSeconds: number }>("/questionnaire/cooldown");
      if (r.retryAfterSeconds > 0) return setCooldown(r.retryAfterSeconds);
    } catch {
      /* 查詢失敗就直接進問卷，送出時後端仍會擋 */
    }
    navigate("/questionnaire");
  }

  // 尚未填問卷、或作答有衝突：一律回問卷頁
  if (missing || profile?.readiness === "limited") return <Navigate to="/questionnaire" replace />;
  if (error) return <p style={{ padding: "2rem", color: "#c00" }}>{error}</p>;
  // 尚未取得資料，或剛填完問卷、描述還在產生中（未逾時）：只顯示「分析中」遮罩，不先顯示指標（「重新產生」時不走這裡）
  if (!profile || (profile.descriptionStatus === "pending" && !gaveUp && !regenerating)) return <LoadingOverlay />;

  const c = profile.coreIndicators;
  const cards: [string, string][] = [
    ["可接受損失區間", c.lossTolerance],
    ["投資期限", c.investmentHorizon],
    ["資金流動性需求", c.liquidityNeed],
    ["財務風險承受能力", c.financialCapacity],
  ];

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 800 }}>
      <h1>我的風險屬性</h1>
      <p>上次填寫時間：{formatTime(profile.created)}</p>

      <h2>核心風險指標</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {cards.map(([label, value]) => (
          <div key={label} style={{ border: "1px solid #999", padding: "0.75rem 1rem", minWidth: 150 }}>
            <div style={{ fontSize: "0.85rem" }}>{label}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 標題列：失敗時「重新產生」按鈕放在標題右側（窄畫面自動換行） */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2>風險屬性解析</h2>
        {profile.descriptionStatus === "failed" && !regenerating && <button onClick={regenerate}>重新產生</button>}
      </div>
      {regenerating && <p style={{ color: "#555" }}>產生中…</p>}
      {!regenerating && profile.descriptionStatus === "ready" && <p>{profile.description}</p>}
      {!regenerating && profile.descriptionStatus === "pending" && <p>描述產生時間較長，請稍後重新整理本頁。</p>}
      {!regenerating && profile.descriptionStatus === "failed" && (
        <p style={{ color: "#555" }}>暫時無法產生，請按「重新產生」再試一次。</p>
      )}
      {regenError && <p style={{ color: "#c00" }}>{regenError}</p>}

      {/* 按鈕依情境變化：剛填完＝回首頁＋新增投資組合；從首頁查看＝回首頁＋重新填寫問卷。
          「新增投資組合」回首頁並直接展開新增表單 */}
      <p style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
        <button onClick={() => navigate("/")}>回首頁</button>
        {justSubmitted ? (
          <button onClick={() => navigate("/", { state: { openCreate: true } })}>新增投資組合</button>
        ) : (
          <button onClick={startRefill}>重新填寫問卷</button>
        )}
      </p>
      {cooldown > 0 && <CooldownModal seconds={cooldown} onClose={() => setCooldown(0)} />}
    </div>
  );
}
