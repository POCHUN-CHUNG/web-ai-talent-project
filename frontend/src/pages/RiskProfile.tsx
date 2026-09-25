import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { formatDateTime } from "../format";
import LoadingOverlay from "../components/LoadingOverlay";
import CooldownModal from "../components/CooldownModal";
import RiskProfileGateModal from "../components/RiskProfileGateModal";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import styles from "./RiskProfile.module.css";

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

// 【風險屬性結果頁】問卷的結果畫面（剛填完或從首頁查看最新一份）：等 AI 描述完成後，一次顯示核心風險指標與風險屬性解析。
// 指標不可調整；等待期間只顯示「分析中」遮罩。尚未填過問卷時停留本頁顯示引導提示；作答有衝突時才導回問卷頁修正。無參數。
export default function RiskProfile() {
  const navigate = useNavigate();
  // 剛填完問卷送出而來（問卷頁帶的記號）：true 顯示「新增投資組合」；從首頁進來查看：false 顯示「重新填寫問卷」
  // blocked：因為想切到其他功能頁但尚未填過問卷，被 RequireProfile 導回本頁（見 auth.tsx），需要跳出強制提示視窗
  const state = useLocation().state as { cooldown?: number; blocked?: boolean } | null;
  const [cooldown, setCooldown] = useState(state?.cooldown ?? 0); // 大於 0 時跳出「請稍後再填」視窗（剩餘秒數）
  const [showGate, setShowGate] = useState(!!state?.blocked); // 是否顯示「尚未完成風險屬性評估」的強制提示視窗
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

  // 作答有衝突：回問卷頁修正；從未填過則留在本頁顯示引導提示（見下方 missing 分支）
  if (profile?.readiness === "limited") return <Navigate to="/questionnaire" replace />;
  if (error) return <p style={{ padding: "2rem", color: "#c00" }}>{error}</p>;
  // 剛切換過來、資料還沒抓回來：只在頁面內容區顯示文字，不要蓋住整個畫面（含頂端 Tab 列），
  // 不然每次切到這頁都會像整頁重新整理一樣閃一下白色遮罩。
  if (!profile && !missing) {
    return (
      <main className={styles.page}>
        <p>載入中…</p>
      </main>
    );
  }
  // 剛填完問卷、描述還在產生中（未逾時）：這裡才是真的要等 AI 跑完，才用「分析中」全螢幕遮罩（「重新產生」時不走這裡）
  if (profile && profile.descriptionStatus === "pending" && !gaveUp && !regenerating) return <LoadingOverlay />;

  const cards: [string, string][] | null = profile
    ? [
        ["可接受損失區間", profile.coreIndicators.lossTolerance],
        ["投資期限", profile.coreIndicators.investmentHorizon],
        ["資金流動性需求", profile.coreIndicators.liquidityNeed],
        ["財務風險承受能力", profile.coreIndicators.financialCapacity],
      ]
    : null;

  return (
      <main className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>我的風險屬性</h1>
            {/* 從未填過問卷時沒有填寫紀錄，不顯示這個區塊 */}
            {profile && (
              <div className={`${styles.metaText} ${styles.metaTextMobile}`}>
                <Icon name="schedule" size={16} />
                上次填寫時間：{formatDateTime(profile.created)}
              </div>
            )}
          </div>
          <div className={styles.headerActions}>
            {profile && (
              <div className={`${styles.metaText} ${styles.metaTextDesktop}`}>
                <Icon name="schedule" size={16} />
                上次填寫時間：{formatDateTime(profile.created)}
              </div>
            )}
            <Button onClick={startRefill}>
              {missing ? "開始評估" : "重新評估"}
            </Button>
          </div>
        </div>

        <div className={styles.content}>
          {missing || !cards || !profile ? (
            <div style={{ padding: "2rem", textAlign: "center", border: "1px dashed var(--color-outline)", borderRadius: "var(--radius-card)", lineHeight: 1.5 }}>
              請點擊右上角「開始評估」，<br className={styles.mobileBreak} />建立您的個人風險屬性報告
            </div>
          ) : (
            <>
              <div className={styles.section}>
                <div className={styles.cardGrid}>
                  {cards.map(([label, value]) => (
                    <div key={label} className={styles.smallCard}>
                      <span className={styles.metricLabel}>{label}</span>
                      <span className={styles.metricValue}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                {regenerating && <div className={styles.emptyText}>產生中…</div>}
                {!regenerating && profile.descriptionStatus === "ready" && (
                  <div className={styles.description}>{profile.description}</div>
                )}
                {!regenerating && profile.descriptionStatus === "pending" && (
                  <div className={styles.emptyText}>描述產生時間較長，請稍後重新整理本頁。</div>
                )}
                {!regenerating && profile.descriptionStatus === "failed" && (
                  <div className={styles.emptyText}>暫時無法產生，請按「重新產生」再試一次。</div>
                )}
                {regenError && <div className={styles.errorText}>{regenError}</div>}
              </div>
            </>
          )}
        </div>

        {cooldown > 0 && <CooldownModal seconds={cooldown} onClose={() => setCooldown(0)} />}
        {/* 被 RequireProfile 擋下來才顯示；可按「取消」關閉留在本頁，或按「開始評估」前往問卷 */}
        {missing && showGate && (
          <RiskProfileGateModal
            onStart={() => {
              setShowGate(false);
              startRefill();
            }}
            onCancel={() => setShowGate(false)}
          />
        )}
      </main>
  );
}
