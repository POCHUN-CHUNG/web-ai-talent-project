import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnswerConflict, api, ApiError } from "../api";
import { useAuth } from "../auth";
import AlertDialog from "../components/ui/AlertDialog";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Chip from "../components/ui/Chip";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import styles from "./Questionnaire.module.css";

// 題目與選項（後端 GET /questionnaire 提供）
type Option = { value: string; label: string };
type Question = {
  id: string;
  title: string;
  type: "single" | "multiple";
  options: Option[];
  exclusiveOption?: string; // 複選題中，勾選後其餘選項自動取消的選項
  otherOption?: string; // 勾選後需填自由文字的選項
};
const OTHER_MAX = 100; // 「其他商品」說明最長 100 字
const PARTNER_SCROLL_DELAY_MS = 500; // 改完衝突題後，等 0.5 秒再捲到與它矛盾的那一題

// 【題號轉顯示文字】Q10 → 「第 10 題」，與題目卡上的編號一致。參數：qid=題號
const questionLabel = (qid: string) => `第 ${qid.slice(1)} 題`;

// 【捲動到題目】平滑捲動到指定題目並把焦點移到第一個選項；題目頂端停在頂端 Tab 列正下方（留白由 CSS 的 scroll-margin-top 控制），
// 讓使用者從題目開頭往下讀；使用者設定減少動態效果時直接跳過去。參數：qid=題號
function scrollToQuestion(qid: string) {
  const el = document.getElementById(`question-${qid}`);
  if (!el) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  el.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
}

// 【問卷頁】14 題風險評估問卷，單欄排列：作答、進度、送出。未作答的題目與互相矛盾的題目以紅框標示；
// 作答衝突時後端不存資料，跳出提示視窗，按「確認」後自動捲到第一個需要修正的題目。
// 衝突以「一組題目」為單位：改了其中任一題，整組紅框一起取消（交由下次送出時後端重新檢查）；
// 畫面上還有紅框時不能送出。無參數。
export default function Questionnaire() {
  const navigate = useNavigate();
  const { refreshProfile, profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({}); // 鍵為題號（Q1…）
  const [other, setOther] = useState(""); // Q11「其他商品」的說明
  const [conflicts, setConflicts] = useState<AnswerConflict[]>([]); // 尚未處理的作答衝突（每項是一組互相矛盾的題目）
  const [dialogOpen, setDialogOpen] = useState(false); // 衝突提示視窗是否顯示
  const [showMissing, setShowMissing] = useState(false); // 按過送出後，才用紅框標示未作答的題目
  const [error, setError] = useState(""); // 其他錯誤（連線、後端驗證）
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldownError, setCooldownError] = useState(0); // 填寫過於頻繁時的倒數秒數

  // 每秒倒數一次（到 0 停止）
  useEffect(() => {
    if (cooldownError <= 0) return;
    const t = window.setTimeout(() => setCooldownError((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldownError]);

  // 已有結果的人（重新評估）進頁前先確認是否還在冷卻：是就退回結果頁並跳出提示視窗，連問卷都不能填
  const [checking, setChecking] = useState(profile === "ready");
  useEffect(() => {
    if (profile !== "ready") return;
    api<{ retryAfterSeconds: number }>("/questionnaire/cooldown")
      .then((r) => {
        if (r.retryAfterSeconds > 0) navigate("/risk-profile", { replace: true, state: { cooldown: r.retryAfterSeconds } });
        else setChecking(false);
      })
      .catch(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在進頁時檢查一次（送出後 profile 變成 ready 不應重查）

  // 【載入題目】進頁時取得題目
  useEffect(() => {
    api<{ questions: Question[] }>("/questionnaire")
      .then((r) => setQuestions(r.questions))
      .catch(() => setLoadError("無法載入問卷，請稍後再試"));
  }, []);

  // 【是否已作答】單選有值、複選至少一項。參數：q=題目
  const isAnswered = (q: Question) => (answers[q.id]?.length ?? 0) > 0;
  // 【是否需要填「其他商品」說明】勾了「其他商品」卻沒寫內容。參數：q=題目
  const needsOther = (q: Question) =>
    !!q.otherOption && ((answers[q.id] as string[] | undefined) ?? []).includes(q.otherOption) && !other.trim();
  const answeredCount = questions.filter(isAnswered).length;

  // 【標示原因】回傳這題要顯示的紅字提示；不需標示時回 null。參數：q=題目
  function flagOf(q: Question): string | null {
    // 與哪幾題矛盾：同一組衝突裡的其他題號
    const partners = conflicts.filter((c) => c.questionIds.includes(q.id)).flatMap((c) => c.questionIds).filter((id) => id !== q.id);
    if (partners.length) return `與${[...new Set(partners)].map(questionLabel).join("、")}的回答互相矛盾，請確認`;
    if (showMissing && !isAnswered(q)) return "尚未作答";
    if (showMissing && needsOther(q)) return "請填寫「其他商品」的說明";
    return null;
  }

  // 【改答案】記下新答案；若這題屬於某組衝突，改過就取消整組的紅框（衝突是兩題之間的關係，
  // 改了任一題都可能已解決，是否真的解決由下次送出時後端重新檢查），並捲到與它矛盾的那一題，
  // 讓使用者接著確認另一題。參數：qid=題號、value=新答案
  function setAnswer(qid: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [qid]: value }));
    const partners = conflicts.filter((c) => c.questionIds.includes(qid)).flatMap((c) => c.questionIds);
    if (!partners.length) return;
    setConflicts((cs) => cs.filter((c) => !c.questionIds.includes(qid)));
    const next = questions.find((q) => q.id !== qid && partners.includes(q.id)); // 依題目順序取第一個
    // 稍等一下再捲動，讓使用者先看到自己的選擇已經生效
    if (next) window.setTimeout(() => scrollToQuestion(next.id), PARTNER_SCROLL_DELAY_MS);
  }

  // 【勾複選】Q11：勾「從未投資過」會取消其他；勾其他選項會取消「從未投資過」。參數：q=題目、value=選項代號
  function toggleMulti(q: Question, value: string) {
    const cur = (answers[q.id] as string[] | undefined) ?? [];
    let next: string[];
    if (cur.includes(value)) next = cur.filter((v) => v !== value);
    else if (value === q.exclusiveOption) next = [value];
    else next = [...cur.filter((v) => v !== q.exclusiveOption), value];
    setAnswer(q.id, next);
  }

  // 【送出問卷】檢查 → 送後端 → 成功導向風險屬性結果頁；作答衝突（後端不存資料）則標示題號並跳出提示視窗
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    // 1. 畫面上還有沒處理的衝突紅框：不送出，再次跳出提示視窗
    if (conflicts.length) return setDialogOpen(true);
    // 2. 有未作答或「其他商品」沒填說明：紅框標示並捲到第一題
    const firstMissing = questions.find((q) => !isAnswered(q) || needsOther(q));
    if (firstMissing) {
      setShowMissing(true);
      return scrollToQuestion(firstMissing.id);
    }
    // 3. 組成後端要的格式：題號 Q1 → q1，Q11 另帶其他說明
    const body: Record<string, unknown> = {};
    for (const q of questions) body[q.id.toLowerCase()] = answers[q.id];
    const q11 = questions.find((q) => q.id === "Q11");
    const hasOther = !!q11?.otherOption && ((answers.Q11 as string[]) ?? []).includes(q11.otherOption);
    body.q11Other = hasOther ? other.trim() : null;
    setBusy(true);
    try {
      // 4. 送出成功：更新全站的風險屬性狀態後前往結果頁
      await api("/questionnaire/answers", { answers: body });
      await refreshProfile();
      navigate("/risk-profile", { replace: true });
    } catch (err) {
      // 5. 作答衝突：標示題號並跳出提示視窗；太頻繁則開始倒數；其他錯誤顯示在按鈕上方
      if (err instanceof ApiError && err.code === "ANSWER_CONFLICT") {
        setConflicts(err.conflicts ?? []);
        setDialogOpen(true);
      } else if (err instanceof ApiError && err.code === "RATE_LIMITED") {
        api<{ retryAfterSeconds: number }>("/questionnaire/cooldown")
          .then((r) => setCooldownError(r.retryAfterSeconds))
          .catch(() => setCooldownError(60));
      } else {
        setError(err instanceof ApiError ? err.message : "無法連線，請稍後再試");
      }
    } finally {
      setBusy(false);
    }
  }

  // 【關閉衝突提示】按下「確認」後捲到第一個需要修正的題目（依題目順序）
  function closeConflictDialog() {
    setDialogOpen(false);
    const first = questions.find((q) => conflicts.some((c) => c.questionIds.includes(q.id)));
    if (first) scrollToQuestion(first.id);
  }

  if (checking) return null; // 確認冷卻中，先不顯示問卷

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <h1 className={styles.title}>風險屬性評估問卷</h1>
          <div className={styles.disclaimerText}>
            <Icon name="info" size={16} />
            共 14 題，皆為必填
          </div>
        </div>
        <p className={styles.lead}>本問卷旨在了解您的財務狀況、投資目的、經驗及風險承受能力，作為個人投資風險屬性分析之參考。請依實際情況填答，問卷結果僅供參考，不構成投資建議或收益保證。</p>
      </header>

      {loadError && <p className={styles.statusText}>{loadError}</p>}

      <form className={styles.form} onSubmit={submit} noValidate>
        {questions.map((q, i) => {
          const flag = flagOf(q);
          const selected = (answers[q.id] as string[] | string | undefined) ?? (q.type === "multiple" ? [] : "");
          return (
            <Card key={q.id} id={`question-${q.id}`} className={[styles.question, flag ? styles.flagged : ""].join(" ")}>
              <fieldset className={styles.fieldset} aria-invalid={flag ? true : undefined}>
                <legend className={styles.legend}>
                  <span className={styles.number}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.questionTitle}>{q.title}</span>
                </legend>
                <div className={styles.options}>
                  {q.options.map((o) => {
                    const checked = q.type === "single" ? selected === o.value : (selected as string[]).includes(o.value);
                    return (
                      <div key={o.value}>
                        <label className={styles.option}>
                          <input
                            type={q.type === "single" ? "radio" : "checkbox"}
                            className={`${styles.control} ${q.type === "single" ? styles.radio : styles.checkbox}`}
                            name={q.id}
                            value={o.value}
                            checked={checked}
                            onChange={() => (q.type === "single" ? setAnswer(q.id, o.value) : toggleMulti(q, o.value))}
                          />
                          <span>{o.label}</span>
                        </label>
                        {/* Q11 勾「其他商品」時，在該選項下方出現說明欄 */}
                        {q.otherOption === o.value && checked && (
                          <div className={styles.otherField}>
                            <Input
                              id="q11Other"
                              aria-label="請說明投資過的其他商品"
                              value={other}
                              maxLength={OTHER_MAX}
                              placeholder="請說明投資過的其他商品"
                              onChange={(e) => setOther(e.target.value)}
                              error={showMissing && !other.trim()}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {flag && (
                  <p className={styles.flagNote}>
                    <Icon name="error" size={18} />
                    {flag}
                  </p>
                )}
              </fieldset>
            </Card>
          );
        })}

        {questions.length > 0 && (
          <>
            <div className={styles.progress}>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label="作答進度"
                aria-valuemin={0}
                aria-valuemax={questions.length}
                aria-valuenow={answeredCount}
              >
                <div className={styles.progressFill} style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
              </div>
            </div>
            {(error || cooldownError > 0) && (
              <Chip variant="error">
                {cooldownError > 0 
                  ? `操作太頻繁，請於 ${cooldownError} 秒後再試` 
                  : error}
              </Chip>
            )}
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => navigate("/risk-profile")} disabled={busy}>
                取消
              </Button>
              <Button type="submit" busy={busy}>
                {busy ? "送出中" : "送出"}
              </Button>
            </div>
          </>
        )}
      </form>

      <AlertDialog
        open={dialogOpen}
        title="作答內容有矛盾之處，請確認"
        messages={conflicts.map((c) => c.message)}
        onConfirm={closeConflictDialog}
      />
    </main>
  );
}
