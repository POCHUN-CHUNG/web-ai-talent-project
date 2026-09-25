import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { formatDateTime } from "../format";
import AnalyzingGlow from "../components/AnalyzingGlow";
import CooldownModal from "../components/CooldownModal";
import RiskProfileGateModal from "../components/RiskProfileGateModal";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import styles from "./RiskProfile.module.css";

// AI 解析的一段：key=段落代號、body=內文
type Section = { key: string; body: string };
// 風險屬性（後端 GET /risk-profiles/latest 的內容）
type Profile = {
  id: number;
  coreIndicators: { lossTolerance: string; investmentHorizon: string; liquidityNeed: string; financialCapacity: string };
  sections: Section[] | null;
  sectionsStatus: "pending" | "ready" | "failed";
  created: string;
};
// 四段解析的標題（依 Prompt 規定的段落代號）
const SECTION_TITLES: Record<string, string> = {
  funding_timing: "資金定位與時間彈性",
  willingness_capacity: "承受意願與財務能力",
  decline_response: "下跌反應與投資比重",
  knowledge_experience: "投資知識與實務經驗",
};
const POLL_MS = 2000; // AI 解析尚未完成時，每 2 秒重取一次
const POLL_MAX = 130; // 最多等約 4 分鐘多（涵蓋後端最多 3 次呼叫與重試間隔），之後停止等待

// 【風險屬性結果頁】問卷的結果畫面（剛填完或從首頁查看最新一份）：等 AI 解析完成後，一次顯示核心風險指標與四段風險屬性解析。
// 指標不可調整；等待期間只顯示標題、轉圈圈與外框閃爍。尚未填過問卷時停留本頁顯示引導提示。無參數。
export default function RiskProfile() {
  const navigate = useNavigate();
  // cooldown：從問卷頁被冷卻擋回來時帶的剩餘秒數
  // blocked：因為想切到其他功能頁但尚未填過問卷，被 RequireProfile 導回本頁（見 auth.tsx），需要跳出強制提示視窗
  const location = useLocation();
  const state = location.state as { cooldown?: number; blocked?: boolean } | null;
  const [cooldown, setCooldown] = useState(state?.cooldown ?? 0); // 大於 0 時跳出「請稍後再填」視窗（剩餘秒數）
  const [showGate, setShowGate] = useState(!!state?.blocked); // 是否顯示「尚未完成風險屬性評估」的強制提示視窗

  // 記號只用一次：讀進上面兩個狀態後立刻從瀏覽紀錄清掉。瀏覽器重新整理時會保留這筆紀錄附帶的資料，
  // 不清掉的話，在本頁重新整理會再次跳出提示視窗（或用過期的秒數再跳一次冷卻視窗）
  useEffect(() => {
    if (state?.blocked || state?.cooldown) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false); // 從未填過問卷
  const [error, setError] = useState("");
  const [gaveUp, setGaveUp] = useState(false); // 等太久仍未產生解析
  const tries = useRef(0);
  const [pollKey, setPollKey] = useState(0); // 每按一次「重新產生」加 1，重新啟動輪詢
  const [regenError, setRegenError] = useState("");
  const [regenerating, setRegenerating] = useState(false); // 按了「重新產生」、等待結果中：解析區塊顯示「產生中…」、外框閃爍，其餘內容維持顯示

  // 【載入並輪詢】取得最新風險屬性；解析仍是 pending 就隔 2 秒再取，直到完成或超過等待上限
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    async function load() {
      try {
        const p = await api<Profile>("/risk-profiles/latest");
        if (stopped) return;
        setProfile(p);
        if (p.sectionsStatus !== "pending") setRegenerating(false); // 已有結果（成功或失敗）：結束「產生中…」
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

  // 【重新產生】解析失敗時再要一次：成功送出後解析區塊顯示「產生中…」並輪詢等結果；太頻繁（429）等錯誤顯示在解析區塊下方
  async function regenerate() {
    if (!profile) return;
    setRegenError("");
    try {
      await api(`/risk-profiles/${profile.id}/regenerate-sections`, {});
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

  if (error) return <p style={{ padding: "2rem", color: "#c00" }}>{error}</p>;
  // 剛填完問卷、解析還在產生中（未逾時）：只顯示標題與下方轉圈圈（不加任何文字），外框以背景漸層色閃爍；
  // 指標、上次填寫時間與按鈕等分析完成後才一次顯示（「重新產生」時不走這裡）
  const analyzing = !!profile && profile.sectionsStatus === "pending" && !gaveUp && !regenerating;
  // 剛切換過來、資料還沒抓回來：只顯示標題，避免閃一下文字或遮罩
  if ((!profile && !missing) || analyzing) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>我的風險屬性</h1>
        </div>
        {analyzing && (
          <>
            <div className={styles.spinnerWrap} role="status" aria-label="分析中">
              <div className={styles.spinner} />
            </div>
            <AnalyzingGlow />
          </>
        )}
      </main>
    );
  }

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

              {/* AI 解析：成功顯示四段有標題的內容；失敗才顯示錯誤說明與「重新產生」按鈕 */}
              <div className={styles.card}>
                {regenerating && <div className={styles.emptyText}>產生中…</div>}
                {!regenerating && profile.sectionsStatus === "ready" &&
                  profile.sections?.map((s) => (
                    <div key={s.key} className={styles.analysisSection}>
                      <h2 className={styles.analysisTitle}>{SECTION_TITLES[s.key] ?? s.key}</h2>
                      <p className={styles.analysisBody}>{s.body}</p>
                    </div>
                  ))}
                {!regenerating && profile.sectionsStatus === "pending" && (
                  <div className={styles.emptyText}>解析產生時間較長，請稍後重新整理本頁。</div>
                )}
                {!regenerating && profile.sectionsStatus === "failed" && (
                  <div className={styles.failedRow}>
                    <div className={styles.errorText}>AI 風險屬性解析暫時無法產生，請按「重新產生」再試一次。</div>
                    <Button variant="outlined" onClick={regenerate}>
                      重新產生
                    </Button>
                  </div>
                )}
                {regenError && <div className={styles.errorText}>{regenError}</div>}
              </div>
            </>
          )}
        </div>

        {/* 按「重新產生」後等待結果：指標維持顯示，外框同樣以背景漸層色閃爍，結果回來即停止 */}
        {regenerating && <AnalyzingGlow />}
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
