import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import LotForm from "../components/LotForm";
import TradeDatePicker from "../components/TradeDatePicker";
import { AllocationChart, PnlChart } from "../components/PortfolioCharts";
import Footer from "../components/layout/Footer";
import { DISCLAIMER, PRICE_NOTE, TOO_SHORT, checkLotFields, decimal, fix4, money, pct, pnlColor, signedMoney } from "../format";

// 單筆買進紀錄（含該筆損益與持有天數）
type Lot = {
  id: number; symbol: string; tradeDate: string; quantity: string; unitCost: string; costAmount: string;
  marketValue: string | null; unrealizedPnl: string | null; unrealizedReturn: number | null; holdingDays: number;
};
// 持股部位：同一檔全部買進紀錄的彙總
type Position = {
  symbol: string; name: string; quantity: string; averageCost: string; costAmount: string;
  latestPrice: string | null; latestPriceDate: string | null; marketValue: string | null; unrealizedPnl: string | null;
  unrealizedReturn: number | null; holdingDays: number; annualizedReturn: number | null; weight: number | null; lots: Lot[];
};
type Detail = {
  id: number; name: string; positions: Position[];
  totals: { costAmount: string; marketValue: string | null; unrealizedPnl: string | null; unrealizedReturn: number | null; holdingDays: number; annualizedReturn: number | null };
  priceDisclaimer: string; latestPriceDate: string | null;
};
const NAME_MAX = 30; // 組合名稱最長字數（與後端一致）

// 【年化報酬顯示】有值顯示百分比；持有未滿 30 日顯示原因；缺報價顯示「—」。參數：v=年化報酬率、days=持有天數、hasPrice=是否有報價
function annualText(v: number | null, days: number, hasPrice: boolean): string {
  if (v != null) return pct(v, true);
  return hasPrice && days < 30 ? TOO_SHORT : "—";
}

// 【投資組合詳情頁】單一組合的總覽數字、配置與損益圖、持股表格（每檔可展開看全部買進紀錄並修改／刪除）、新增買進紀錄表單、
// 以及分析入口與歷史分析報告區。組合不存在或不是自己的，導回首頁。無參數。
export default function PortfolioDetail() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Detail | null>(null); // null＝載入中
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set()); // 已展開的代號
  const [preset, setPreset] = useState<{ symbol: string; name: string; market: string; industry: string } | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null); // 非 null＝改名中（內容為輸入值）
  const [actionError, setActionError] = useState(""); // 改名、刪除、修改紀錄失敗的說明

  // 【載入明細】取得組合；404／403 導回首頁，其他錯誤顯示整頁錯誤卡
  const load = useCallback(async () => {
    try {
      setData(await api<Detail>(`/portfolios/${portfolioId}`));
      setError("");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 403)) navigate("/", { replace: true });
      else setError(e instanceof ApiError ? e.message : "載入失敗，請稍後再試");
    }
  }, [portfolioId, navigate]);
  useEffect(() => { setData(null); load(); }, [load]);

  // 【展開／收合】切換某檔持股的買進紀錄列表。參數：symbol=代號
  function toggle(symbol: string) {
    setOpen((s) => { const n = new Set(s); n.has(symbol) ? n.delete(symbol) : n.add(symbol); return n; });
  }

  // 【儲存新名稱】改名成功後重新載入
  async function rename() {
    const n = (editingName ?? "").trim();
    if (n.length < 1 || n.length > NAME_MAX) return setActionError(`組合名稱須為 1～${NAME_MAX} 字`);
    try {
      await api(`/portfolios/${portfolioId}`, { name: n }, "PATCH");
      setEditingName(null); setActionError("");
      await load();
    } catch (e) { setActionError(e instanceof ApiError ? e.message : "改名失敗"); }
  }

  // 【刪除組合】二次確認後刪除整個組合（含全部買進紀錄），回首頁
  async function removePortfolio() {
    if (!window.confirm(`確定刪除「${data?.name}」？組合內全部買進紀錄也會一併刪除，無法復原。`)) return;
    try {
      await api(`/portfolios/${portfolioId}`, undefined, "DELETE");
      navigate("/", { replace: true });
    } catch (e) { setActionError(e instanceof ApiError ? e.message : "刪除失敗"); }
  }

  // 【刪除買進紀錄】二次確認後刪除單筆。參數：lot=要刪除的紀錄
  async function removeLot(lot: Lot) {
    if (!window.confirm(`確定刪除 ${lot.symbol} 於 ${lot.tradeDate} 的這筆買進紀錄？`)) return;
    try {
      await api(`/portfolios/${portfolioId}/holding-lots/${lot.id}`, undefined, "DELETE");
      setActionError("");
      await load();
    } catch (e) { setActionError(e instanceof ApiError ? e.message : "刪除失敗"); }
  }

  if (error) return <Shell><div role="alert" style={{ border: "1px solid #b91c1c", padding: "1rem" }}>{error}　<button onClick={load}>重試</button></div></Shell>;
  if (!data) return <Shell><p role="status">載入中…</p></Shell>;

  const { totals, positions } = data;
  const missingPrice = positions.some((p) => p.marketValue == null); // 有持股缺最新報價
  const empty = positions.length === 0;
  return (
    <Shell>
      {/* 標題列：組合名稱（可改名）與刪除 */}
      <header style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        {editingName === null ? (
          <>
            <h1 style={{ margin: 0 }}>{data.name}</h1>
            <button onClick={() => { setEditingName(data.name); setActionError(""); }}>改名</button>
          </>
        ) : (
          <>
            <input value={editingName} maxLength={NAME_MAX} onChange={(e) => setEditingName(e.target.value)} autoFocus />
            <button onClick={rename} disabled={!editingName.trim()}>儲存</button>
            <button onClick={() => { setEditingName(null); setActionError(""); }}>取消</button>
          </>
        )}
        <button onClick={removePortfolio} style={{ marginLeft: "auto" }}>刪除組合</button>
      </header>
      {actionError && <div role="alert" style={{ color: "#b91c1c" }}>{actionError}</div>}

      {/* 總覽數字：投入成本、市值、未實現損益、報酬率、持有天數、年化報酬 */}
      <section aria-label="總覽" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", margin: "1rem 0" }}>
        <Stat label="投入成本（元）" value={money(totals.costAmount)} />
        <Stat label="目前市值（元）" value={money(totals.marketValue)} />
        <Stat label="未實現損益（元）" value={signedMoney(totals.unrealizedPnl)} color={pnlColor(totals.unrealizedPnl)} />
        <Stat label="未實現報酬率" value={pct(totals.unrealizedReturn, true)} color={pnlColor(totals.unrealizedReturn)} />
        <Stat label="平均持有天數" value={empty ? "—" : `${totals.holdingDays} 天`} />
        <Stat label="年化持有報酬率" value={empty ? "—" : annualText(totals.annualizedReturn, totals.holdingDays, totals.marketValue != null)} />
      </section>
      <p style={{ color: "#666", marginTop: 0 }}>
        損益{data.priceDisclaimer || DISCLAIMER}；價格資料日期 {data.latestPriceDate ?? "—"}。
      </p>
      {missingPrice && <p role="alert" style={{ color: "#b45309" }}>部分持股缺少最新報價，市值、損益與市值權重暫時無法計算（配置圖改依投入成本）。</p>}

      {empty ? (
        <div style={{ border: "1px dashed #999", padding: "1.5rem", textAlign: "center", margin: "1rem 0" }}>
          <p>這個組合還沒有買進紀錄。請在下方「新增買進紀錄」輸入第一筆。</p>
        </div>
      ) : (
        <>
          {/* 圖表：配置比例與各檔損益 */}
          <section aria-label="圖表" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", margin: "1rem 0" }}>
            <AllocationChart positions={positions} />
            <PnlChart positions={positions} />
          </section>

          {/* 持股表格：每檔一列，可展開全部買進紀錄 */}
          <section aria-label="持股列表">
            <h2>持股列表</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
                <thead>
                  <tr style={{ textAlign: "right", borderBottom: "1px solid #999" }}>
                    <th style={{ textAlign: "left" }}>股票</th><th>股數</th><th>加權平均成本</th><th>最新價</th><th>市值</th>
                    <th>未實現損益</th><th>報酬率</th><th>年化報酬</th><th>權重</th><th />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <Fragment key={p.symbol}>
                      <tr style={{ textAlign: "right", borderBottom: "1px solid #ddd" }}>
                        <td style={{ textAlign: "left" }}>{p.symbol} {p.name}</td>
                        <td>{decimal(p.quantity)}</td>
                        <td>{decimal(p.averageCost)}</td>
                        <td>{decimal(p.latestPrice)}<div style={{ fontSize: "0.75rem", color: "#666" }}>{p.latestPriceDate ?? "無報價"}</div></td>
                        <td>{money(p.marketValue)}</td>
                        <td style={{ color: pnlColor(p.unrealizedPnl) }}>{signedMoney(p.unrealizedPnl)}</td>
                        <td style={{ color: pnlColor(p.unrealizedReturn) }}>{pct(p.unrealizedReturn, true)}</td>
                        <td style={{ maxWidth: 110 }}>{annualText(p.annualizedReturn, p.holdingDays, p.marketValue != null)}</td>
                        <td>{pct(p.weight)}</td>
                        <td>
                          <button onClick={() => toggle(p.symbol)} aria-expanded={open.has(p.symbol)}>
                            {open.has(p.symbol) ? "收合" : `明細（${p.lots.length}）`}
                          </button>
                        </td>
                      </tr>
                      {open.has(p.symbol) && (
                        <tr>
                          <td colSpan={10} style={{ background: "#f9fafb", padding: "0.5rem 1rem" }}>
                            <LotTable position={p} portfolioId={data.id} onChanged={load} onError={setActionError}
                              onRemove={removeLot}
                              onBuyMore={() => { setPreset({ symbol: p.symbol, name: p.name, market: "", industry: "" }); document.getElementById("lot-form")?.scrollIntoView({ behavior: "smooth" }); }} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* 新增買進紀錄 */}
      <div id="lot-form" style={{ margin: "1.5rem 0" }}>
        <LotForm portfolioId={data.id} preset={preset} onAdded={() => { setPreset(null); load(); }} />
      </div>

      {/* 分析入口：量化分析尚未實作，按鈕先停用；沒有買進紀錄時另註明原因 */}
      <section aria-label="量化分析" style={{ margin: "1.5rem 0" }}>
        <h2>量化分析</h2>
        <button disabled>開始分析</button>{" "}
        <span style={{ color: "#666" }}>{empty ? "請先新增至少一筆買進紀錄才能分析。" : "量化分析功能開發中，完成後會在此啟動。"}</span>
      </section>

      {/* 歷史分析報告：分析功能完成後列出該組合每次的分析 */}
      <section aria-label="歷史分析報告">
        <h2>歷史分析報告</h2>
        <div style={{ border: "1px dashed #999", padding: "1rem", color: "#666" }}>尚無分析報告。每次分析都會留下一份唯讀報告，之後可在這裡回看。</div>
      </section>
    </Shell>
  );
}

// 【頁面外框】置中、限制寬度並附「回首頁」連結；版權宣告貼在頁面下方（內容短就貼齊畫面下緣，內容長則跟著捲動）。參數：children=頁面內容
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "1 0 auto", width: "100%" }}>
        <div style={{ padding: "2rem", maxWidth: 1080, margin: "0 auto" }}>
          <p><Link to="/portfolios">← 回投資組合</Link></p>
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}

// 【數字卡】顯示一個標題與一個數字。參數：label=標題、value=數字文字、color=數字顏色（可省略）
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: "0.75rem" }}>
      <div style={{ fontSize: "0.85rem", color: "#666" }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

// 【買進紀錄列表】展開某檔持股後顯示其全部買進紀錄（日期、股數、單價、該筆損益、持有天數），每筆可就地修改或刪除。
// 參數：position=該檔持股、portfolioId=組合編號、onChanged=修改成功後通知重新載入、onError=回報錯誤說明、onRemove=刪除、onBuyMore=在此檔再新增一筆
function LotTable({ position, portfolioId, onChanged, onError, onRemove, onBuyMore }: {
  position: Position; portfolioId: number; onChanged: () => void; onError: (m: string) => void; onRemove: (l: Lot) => void; onBuyMore: () => void;
}) {
  const [editing, setEditing] = useState<number | null>(null); // 修改中的紀錄編號
  const [draft, setDraft] = useState({ tradeDate: "", quantity: "" });
  const [busy, setBusy] = useState(false);

  // 【開始修改】把該筆現值帶入輸入框。參數：l=紀錄
  function edit(l: Lot) {
    setDraft({ tradeDate: l.tradeDate, quantity: l.quantity });
    setEditing(l.id);
    onError("");
  }

  // 【儲存修改】只送有改動的欄位；沒改動就直接關閉。參數：l=原本的紀錄
  async function save(l: Lot) {
    const msg = checkLotFields(draft.tradeDate, draft.quantity);
    if (msg) return onError(msg);
    const body: Record<string, string> = {};
    if (draft.tradeDate !== l.tradeDate) body.tradeDate = draft.tradeDate;
    if (Number(draft.quantity) !== Number(l.quantity)) body.quantity = fix4(draft.quantity);
    if (Object.keys(body).length === 0) return setEditing(null);
    setBusy(true);
    try {
      await api(`/portfolios/${portfolioId}/holding-lots/${l.id}`, body, "PATCH");
      setEditing(null);
      onError("");
      onChanged();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "修改失敗");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>
            <th style={{ textAlign: "left" }}>買進日期</th><th>股數</th><th>每股價格（調整後）</th><th>投入成本</th><th>該筆損益</th><th>持有天數</th><th />
          </tr>
        </thead>
        <tbody>
          {position.lots.map((l) => editing === l.id ? (
            <tr key={l.id} style={{ textAlign: "right" }}>
              <td style={{ textAlign: "left" }}><TradeDatePicker symbol={position.symbol} value={draft.tradeDate} onChange={(v) => setDraft({ ...draft, tradeDate: v })} /></td>
              <td><input type="number" step="any" min="0" value={draft.quantity} style={{ width: 110 }} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} onBlur={() => setDraft((d) => ({ ...d, quantity: fix4(d.quantity) }))} /></td>
              <td colSpan={4} style={{ textAlign: "left", fontSize: "0.85rem", color: "#666" }}>日期只能選有資料的交易日；每股價格會依新日期重新帶入當天調整後收盤價</td>
              <td>
                <button onClick={() => save(l)} disabled={busy}>{busy ? "儲存中…" : "儲存"}</button>{" "}
                <button onClick={() => { setEditing(null); onError(""); }} disabled={busy}>取消</button>
              </td>
            </tr>
          ) : (
            <tr key={l.id} style={{ textAlign: "right" }}>
              <td style={{ textAlign: "left" }}>{l.tradeDate}</td>
              <td>{decimal(l.quantity)}</td>
              <td>{decimal(l.unitCost)}</td>
              <td>{money(l.costAmount)}</td>
              <td style={{ color: pnlColor(l.unrealizedPnl) }}>{signedMoney(l.unrealizedPnl)}（{pct(l.unrealizedReturn, true)}）</td>
              <td>{l.holdingDays} 天</td>
              <td><button onClick={() => edit(l)}>修改</button> <button onClick={() => onRemove(l)}>刪除</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: "0.5rem 0 0" }}>
        <button onClick={onBuyMore}>在 {position.symbol} 再新增一筆</button>
        <span style={{ marginLeft: 8, fontSize: "0.85rem", color: "#666" }}>{PRICE_NOTE} 損益{DISCLAIMER}。代號無法修改，若買錯股票請刪除後重建。</span>
      </p>
    </div>
  );
}
