import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { DISCLAIMER, formatDateTime, money, pct, signedMoney } from "../format";
import Icon from "../components/ui/Icon";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import modalStyles from "../components/ui/Modal.module.css";
import styles from "./Portfolios.module.css";

type Summary = {
  id: number;
  name: string;
  symbolCount: number;
  symbols: { symbol: string; name: string }[];
  costAmount: string;
  marketValue: string | null;
  unrealizedPnl: string | null;
  unrealizedReturn: number | null;
  annualizedReturn: number | null;
  latestDayPnl: string | null;
  latestDayPnlPercent: number | null;
  latestPriceDate: string | null;
  lastAnalysisAt: string | null;
};
const MAX_PORTFOLIOS = 20;
const NAME_MAX = 30;

export default function Portfolios() {
  const navigate = useNavigate();
  const openCreate = !!(useLocation().state as { openCreate?: boolean } | null)?.openCreate;
  const [items, setItems] = useState<Summary[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(openCreate);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setItems((await api<{ items: Summary[] }>("/portfolios")).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "載入失敗，請稍後再試");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 1 || n.length > NAME_MAX) return setFormError(`組合名稱須為 1～${NAME_MAX} 字`);
    setBusy(true);
    setFormError("");
    try {
      const p = await api<{ id: number }>("/portfolios", { name: n });
      navigate(`/portfolios/${p.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "新增失敗，請稍後再試");
      setBusy(false);
    }
  }

  // 【關閉新增視窗】清空輸入內容；建立中（等後端回應）不能關閉，避免中斷請求。無參數。
  function closeCreate() {
    if (busy) return;
    setCreating(false);
    setName("");
    setFormError("");
  }

  const full = (items?.length ?? 0) >= MAX_PORTFOLIOS;

  function renderMetric(label: string, value: string, colorClass = styles.neutral) {
    return (
      <div className={styles.metric}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={`${styles.metricValue} ${colorClass}`}>{value}</span>
      </div>
    );
  }

  function getPnlColorClass(value: string | number | null) {
    if (value == null) return styles.neutral;
    const v = Number(value);
    if (v > 0) return styles.positive;
    if (v < 0) return styles.negative;
    return styles.neutral;
  }

  return (
      <main className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>我的投資組合</h1>
            <div className={`${styles.disclaimerText} ${styles.metaTextMobile}`}>
              <Icon name="info" size={16} />
              未納入手續費與交易稅
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={`${styles.disclaimerText} ${styles.metaTextDesktop}`}>
              <Icon name="info" size={16} />
              未納入手續費與交易稅
            </div>
            <Button onClick={() => setCreating(true)} disabled={full || items === null}>
              新增
            </Button>
          </div>
        </div>

        {full && (
          <div>
            <span style={{ color: "var(--color-on-surface-variant)" }}>已達 {MAX_PORTFOLIOS} 個組合上限</span>
          </div>
        )}

        {creating && (
          <Modal title="新增投資組合" onClose={closeCreate}>
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <Input
                id="newPortfolioName"
                label="名稱"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                autoFocus
                disabled={busy}
              />
              {formError && <span style={{ color: "var(--color-error)" }}>{formError}</span>}
              <div className={modalStyles.actions}>
                <Button type="submit" disabled={busy || !name.trim()}>
                  {busy ? "建立中…" : "建立"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        <div className={styles.content}>
          {error ? (
            <div role="alert" style={{ border: "1px solid var(--color-error)", padding: "1rem", color: "var(--color-error)" }}>
              {error}　<Button onClick={load} variant="outlined">重試</Button>
            </div>
          ) : items === null ? (
            <p>載入中…</p>
          ) : items.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", border: "1px dashed var(--color-outline)", borderRadius: "var(--radius-card)", lineHeight: 1.5 }}>
              請點擊右上角「新增」，<br className={styles.mobileBreak} />建立您的第一個投資組合
            </div>
          ) : (
            items.map((p) => (
              <Link key={p.id} to={`/portfolios/${p.id}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{p.name}</h2>
                  <span className={styles.updateTime}>資料更新時間：{formatDateTime(p.latestPriceDate)}</span>
                </div>
                {p.symbolCount === 0 ? (
                  <div style={{ color: "var(--color-on-surface-variant)" }}>無庫存明細</div>
                ) : (
                  <>
                    <div className={styles.grid}>
                      {renderMetric("目前總市值", p.marketValue == null ? "-" : `${money(p.marketValue)}`)}
                      {renderMetric("年化報酬率", pct(Math.abs(p.annualizedReturn || 0)), getPnlColorClass(p.annualizedReturn))}
                      {renderMetric("最新日損益", p.latestDayPnl == null ? "-" : `${money(Math.abs(Number(p.latestDayPnl)).toString())} (${pct(Math.abs(p.latestDayPnlPercent || 0))})`, getPnlColorClass(p.latestDayPnl))}
                      {renderMetric("歷史總損益", p.unrealizedPnl == null ? "-" : `${money(Math.abs(Number(p.unrealizedPnl)).toString())} (${pct(Math.abs(p.unrealizedReturn || 0))})`, getPnlColorClass(p.unrealizedPnl))}
                    </div>
                    {/* 持有標的一覽：用標籤列出代號與名稱，不用點進明細頁就能看到組合裡有哪些股票 */}
                    <div className={styles.symbolList}>
                      {p.symbols.map((s) => (
                        <span key={s.symbol} className={styles.symbolPill}>
                          <span className={styles.symbolCode}>{s.symbol}</span>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </Link>
            ))
          )}
        </div>
      </main>
  );
}
