import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import LoadingOverlay from "../components/LoadingOverlay";

// 題目與選項（後端 GET /questionnaire 提供）
type Option = { value: string; label: string };
type Question = {
  id: string;
  title: string;
  note: string | null; // 題目的補充說明
  type: "single" | "multiple";
  options: Option[];
  exclusiveOption?: string; // 複選題中，勾選後其餘選項自動取消的選項
  otherOption?: string; // 勾選後需填自由文字的選項
};
// 風險屬性中前端只需要的部分：資料問題與事實（用來找出衝突的題號）
type Profile = {
  readiness: string;
  issues: { description: string; affectedFactIds: string[] }[];
  facts: { id: string; sourceQuestionIds: string[] }[];
};
const OTHER_MAX = 100; // 「其他」說明最長 100 字

// 【問卷頁】14 題風險評估問卷：作答、即時檢查、送出；作答有衝突時擋住流程並標示題號。無參數。
export default function Questionnaire() {
  const navigate = useNavigate();
  const { refreshProfile, profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({}); // 鍵為題號（Q1…）
  const [other, setOther] = useState(""); // Q11「其他」的說明
  const [conflict, setConflict] = useState<Profile | null>(null); // 目前有衝突的風險屬性
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // 已有可用結果的人（重填）進頁前先確認是否還在冷卻：是就退回結果頁並跳出提示視窗，連問卷都不能填
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

  // 【載入題目】進頁時取得題目；若最新風險屬性是 limited，一併取得衝突資訊來標示題號
  useEffect(() => {
    api<{ questions: Question[] }>("/questionnaire")
      .then((r) => setQuestions(r.questions))
      .catch(() => setError("無法載入問卷，請稍後再試"));
    if (profile === "limited") {
      api<Profile>("/risk-profiles/latest").then(setConflict).catch(() => {});
    }
  }, [profile]);

  // 有衝突的題號集合（由 issue 的相關事實對應到來源題號）
  const conflictQids = new Set<string>();
  conflict?.issues.forEach((i) =>
    i.affectedFactIds.forEach((fid) => conflict.facts.find((f) => f.id === fid)?.sourceQuestionIds.forEach((q) => conflictQids.add(q))),
  );

  // 【選單選】單選題直接記下選項
  function pickSingle(qid: string, value: string) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  // 【勾複選】Q11：勾「尚未投資過」會取消其他；勾其他選項會取消「尚未投資過」
  function toggleMulti(q: Question, value: string) {
    const cur = (answers[q.id] as string[] | undefined) ?? [];
    let next: string[];
    if (cur.includes(value)) next = cur.filter((v) => v !== value);
    else if (value === q.exclusiveOption) next = [value];
    else next = [...cur.filter((v) => v !== q.exclusiveOption), value];
    setAnswers((a) => ({ ...a, [q.id]: next }));
  }

  // 【找出第一個問題】回傳第一個未作答題號或其他說明的錯誤；沒有問題回 null
  function firstProblem(): string | null {
    for (const q of questions) {
      const v = answers[q.id];
      if (!v || v.length === 0) return `${q.id} 尚未作答`;
    }
    const q11 = questions.find((q) => q.id === "Q11");
    if (q11?.otherOption && (answers.Q11 as string[]).includes(q11.otherOption)) {
      if (!other.trim()) return "Q11 選「其他」時必須填寫說明";
    }
    return null;
  }

  // 【送出問卷】檢查 → 送後端 → 依結果導向風險屬性結果頁，或留在本頁標示衝突
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const problem = firstProblem();
    if (problem) return setError(problem);
    // 1. 組成後端要的格式：題號 Q1 → q1，Q11 另帶其他說明
    const body: Record<string, unknown> = {};
    for (const q of questions) body[q.id.toLowerCase()] = answers[q.id];
    const q11 = questions.find((q) => q.id === "Q11");
    const hasOther = !!q11?.otherOption && (answers.Q11 as string[]).includes(q11.otherOption);
    body.q11Other = hasOther ? other.trim() : null;
    setBusy(true);
    try {
      // 2. 送出並更新全站的風險屬性狀態
      const r = await api<{ readiness: string }>("/questionnaire/answers", { answers: body });
      await refreshProfile();
      // 3. ready：前往結果頁；limited：取得衝突資訊留在本頁
      if (r.readiness === "ready") navigate("/risk-profile", { replace: true, state: { justSubmitted: true } }); // 帶記號：結果頁據此顯示「新增投資組合」
      else {
        setConflict(await api<Profile>("/risk-profiles/latest"));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "無法連線，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return null; // 確認冷卻中，先不顯示問卷

  return (
    <form onSubmit={submit} style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 720 }}>
      <h1>風險評估問卷</h1>
      <p>共 14 題，全部必填。結果只代表這次的回答，重新填寫會產生新的結果。</p>

      {/* 作答衝突：擋住後續流程並標示題號 */}
      {conflict && conflict.readiness === "limited" && (
        <div style={{ border: "2px solid #c00", padding: "0.75rem", marginBottom: "1rem" }}>
          <strong>作答有前後矛盾，請修正 {[...conflictQids].join("、")} 後重新送出：</strong>
          <ul>{conflict.issues.map((i, k) => <li key={k}>{i.description}</li>)}</ul>
        </div>
      )}

      {questions.map((q) => {
        const isConflict = conflictQids.has(q.id);
        return (
          <fieldset key={q.id} style={{ marginBottom: "1rem", border: isConflict ? "2px solid #c00" : undefined }}>
            <legend>
              {q.id}. {q.title} {isConflict && <span style={{ color: "#c00" }}>（請確認）</span>}
            </legend>
            {q.note && <p style={{ fontSize: "0.85rem", color: "#555", margin: "0 0 0.5rem" }}>{q.note}</p>}
            {q.options.map((o) => (
              <div key={o.value}>
                <label>
                  <input
                    type={q.type === "single" ? "radio" : "checkbox"}
                    name={q.id}
                    checked={q.type === "single" ? answers[q.id] === o.value : ((answers[q.id] as string[]) ?? []).includes(o.value)}
                    onChange={() => (q.type === "single" ? pickSingle(q.id, o.value) : toggleMulti(q, o.value))}
                  />{" "}
                  {o.label}
                </label>
                {/* Q11 選「其他」時出現說明欄 */}
                {q.otherOption === o.value && ((answers[q.id] as string[]) ?? []).includes(o.value) && (
                  <input
                    value={other}
                    maxLength={OTHER_MAX}
                    placeholder="請簡述（最多 100 字，僅中英文、數字與全形標點）"
                    onChange={(e) => setOther(e.target.value)}
                    style={{ marginLeft: "0.5rem", width: "60%" }}
                  />
                )}
              </div>
            ))}
          </fieldset>
        );
      })}

      {error && <p style={{ color: "#c00" }}>{error}</p>}
      <button type="submit" disabled={busy || questions.length === 0}>
        送出問卷
      </button>
      {/* 「取消」只給已有可用結果的人（重填）：回到風險屬性結果頁；第一次填寫或作答衝突（無結果可看）的人不顯示 */}
      {profile === "ready" && (
        <button type="button" onClick={() => navigate("/risk-profile")} disabled={busy} style={{ marginLeft: "0.75rem" }}>
          取消
        </button>
      )}
      {busy && <LoadingOverlay />}
    </form>
  );
}
