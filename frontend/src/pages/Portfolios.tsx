import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { DISCLAIMER, formatDateTime, money, NA, pct, signedMoney } from "../format";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import MoreMenu from "../components/ui/MoreMenu";
import { ConfirmDialog, RenameDialog } from "../components/PortfolioDialogs";
import modalStyles from "../components/ui/Modal.module.css";
import styles from "./Portfolios.module.css";
import { enterToNextField } from "../formKeys";
import Chip from "../components/ui/Chip";

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
  const [updatedAt, setUpdatedAt] = useState<string | null>(null); // 股價資料最後更新時間（整張 daily_quotes 的 updated 最新值，與持股無關）
  const [error, setError] = useState("");
  const [action, setAction] = useState<{ kind: "rename" | "delete"; p: Summary } | null>(null); // 卡片選單選了「編輯」或「刪除」的組合
  const [creating, setCreating] = useState(openCreate);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api<{ items: Summary[]; dataUpdatedAt: string | null }>("/portfolios");
      setItems(r.items);
      setUpdatedAt(r.dataUpdatedAt);
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

  // 【指標數字】標題＋數字，數字後面接較小的單位（元、%）；沒有資料（「N/A」）時不顯示單位。
  // 參數：label=標題、value=數字文字、unit=單位、colorClass=數字顏色（賺紅賠綠）
  function renderMetric(label: string, value: string, unit: string, colorClass = styles.neutral) {
    return (
      <div className={styles.metric}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={`${styles.metricValue} ${colorClass}`}>
          {value}
          {value !== NA && <span className={styles.metricUnit}>{unit}</span>}
        </span>
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
            {/* 資料更新時間（手機版放標題下方；桌機版放右上角）；還沒有任何持股報價時整行不顯示 */}
            {updatedAt && (
              <div className={`${styles.metaText} ${styles.metaTextMobile}`}>
                <Icon name="schedule" size={16} />
                資料更新時間：{formatDateTime(updatedAt)}
              </div>
            )}
          </div>
          <div className={styles.headerRight}>
            {updatedAt && (
              <div className={`${styles.metaText} ${styles.metaTextDesktop}`}>
                <Icon name="schedule" size={16} />
                資料更新時間：{formatDateTime(updatedAt)}
              </div>
            )}
            <Button onClick={() => setCreating(true)} disabled={full || items === null}>
              新增組合
            </Button>
          </div>
        </div>

        {/* 提示語：與風險屬性頁同樣的液態玻璃提示框，說明損益的計算口徑；有投資組合時才顯示（空白時只顯示下方虛線提示區） */}
        {items && items.length > 0 && (
          <Notice className={styles.noticeGap}>損益為未實現損益，未納入手續費與交易稅；股價採調整後收盤價（已還原除權息），僅供參考，不構成投資建議。</Notice>
        )}

        {full && (
          <div>
            <span style={{ color: "var(--color-on-surface-variant)" }}>已達 {MAX_PORTFOLIOS} 個組合上限</span>
          </div>
        )}

        {/* 卡片選單：編輯名稱、刪除組合（刪除前一定先確認） */}
        {action?.kind === "rename" && (
          <RenameDialog portfolioId={action.p.id} current={action.p.name} onClose={() => setAction(null)} onDone={() => { setAction(null); load(); }} />
        )}
        {action?.kind === "delete" && (
          <ConfirmDialog title="刪除投資組合" confirmLabel="刪除"
            message={`確定要刪除「${action.p.name}」？ 此動作將一併刪除組合內的所有紀錄，且無法復原。`}
            onClose={() => setAction(null)}
            onConfirm={async () => { await api(`/portfolios/${action.p.id}`, undefined, "DELETE"); setAction(null); load(); }} />
        )}

        {creating && (
          <Modal title="新增投資組合" onCancel={closeCreate}>
            <form onSubmit={create} onKeyDown={enterToNextField} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <Input
                id="newPortfolioName"
                label="名稱"
                placeholder="請輸入投資組合名稱"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                autoFocus
                disabled={busy}
              />
              {/* 錯誤訊息（DESIGN.md）：錯誤 Chip，位於輸入框與按鈕之間 */}
              {formError && <Chip variant="error">{formError}</Chip>}
              <div className={modalStyles.actions}>
                <Button type="button" variant="secondary" onClick={closeCreate} disabled={busy}>取消</Button>
                <Button type="submit" busy={busy}>
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
              請點擊右上角「新增組合」，<br className={styles.mobileBreak} />建立您的第一個投資組合
            </div>
          ) : (
            items.map((p) => (
              // 卡片外包一層：右上角的「⋯」選單放在連結外面（按鈕不能放在連結裡），點選單不會進入組合
              <div key={p.id} className={styles.cardWrap}>
              <MoreMenu className={styles.cardMenu} label={`${p.name} 的更多操作`} items={[
                { label: "編輯", onSelect: () => setAction({ kind: "rename", p }) },
                { label: "刪除", danger: true, onSelect: () => setAction({ kind: "delete", p }) },
              ]} />
              <Link to={`/portfolios/${p.id}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{p.name}</h2>
                </div>
                {p.symbolCount === 0 ? (
                  <div style={{ color: "var(--color-on-surface-variant)" }}>無庫存明細</div>
                ) : (
                  <>
                    <div className={styles.grid}>
                      {renderMetric("目前總市值", money(p.marketValue), "元")}
                      {renderMetric("最新日損益", signedMoney(p.latestDayPnl), "元", getPnlColorClass(p.latestDayPnl))}
                      {renderMetric("歷史總損益", signedMoney(p.unrealizedPnl), "元", getPnlColorClass(p.unrealizedPnl))}
                      {/* 年化報酬率無法計算（持有未滿 30 天或缺報價）時顯示 N/A，與組合詳細頁一致 */}
                      {renderMetric("年化報酬率", p.annualizedReturn == null ? NA : pct(p.annualizedReturn, true).replace(/%$/, ""), "%", getPnlColorClass(p.annualizedReturn))}
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
              </div>
            ))
          )}
        </div>
      </main>
  );
}
