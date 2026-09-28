import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import LotForm, { EditingLot } from "../components/LotForm";
import { HistoryPoint, HistoryTrend, HoldingsHeatmap, IndustryTreemap, ShareDonut, SparkPoint, Sparkline } from "../components/PortfolioCharts";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Chip from "../components/ui/Chip";
import Icon from "../components/ui/Icon";
import IconButton from "../components/ui/IconButton";
import InfoPopover from "../components/ui/InfoPopover";
import Modal from "../components/ui/Modal";
import Notice from "../components/ui/Notice";
import PageSpinner from "../components/ui/PageSpinner";
import { ConfirmDialog, RenameDialog } from "../components/PortfolioDialogs";
import { decimal, formatDateTime, money, NA, pct, pnlColor, signedMoney, todayTaipei } from "../format";
import styles from "./PortfolioDetail.module.css";

const PRICE_NOTE = "每股價格為系統依買進日期自動帶入，可能與實際成交價略有不同"; // 庫存明細標題旁的說明

// 單筆買進紀錄（含該筆損益與持有天數）
type Lot = {
  id: number; symbol: string; tradeDate: string; quantity: string; unitCost: string; costAmount: string;
  marketValue: string | null; unrealizedPnl: string | null; unrealizedReturn: number | null; holdingDays: number;
};
// 持股部位：同一檔全部買進紀錄的彙總（industry／market／securityType 取自官方股票基本資料）
type Position = {
  symbol: string; name: string; industry: string; market: string; securityType: string; quantity: string; averageCost: string; costAmount: string;
  latestPrice: string | null; latestPriceDate: string | null; marketValue: string | null; unrealizedPnl: string | null;
  unrealizedReturn: number | null; holdingDays: number; annualizedReturn: number | null; weight: number | null; lots: Lot[];
};
type Detail = {
  id: number; name: string; positions: Position[];
  totals: {
    costAmount: string; marketValue: string | null; unrealizedPnl: string | null; unrealizedReturn: number | null;
    holdingDays: number; annualizedReturn: number | null; latestDayPnl: string | null; latestDayPnlPercent: number | null;
  };
  priceDisclaimer: string; latestPriceDate: string | null; dataUpdatedAt: string | null;
};
// 目前開著的彈出視窗：新增買進、修改某筆買進紀錄、改名、刪除某筆買進紀錄
type Dialog = { kind: "add" } | { kind: "editLot"; lot: EditingLot } | { kind: "rename" } | { kind: "deleteLot"; lot: Lot } | null;


// 【年化報酬顯示】有值顯示百分比；無法計算（持有未滿 30 日或缺報價）一律顯示「N/A」。參數：v=年化報酬率、_days=持有天數、_hasPrice=是否有報價（保留參數，呼叫端不必改）
function annualText(v: number | null, _days: number, _hasPrice: boolean): string {
  return v != null ? pct(v, true) : NA;
}

// 【投資組合詳情頁】由上而下四個區塊：
// 0. 標題列（名稱＋編輯；右側資料更新時間與「新增持股」），下方液態玻璃提示框
// 1. 總覽與核心績效指標（一個大外框：左側「目前總市值」，右側 2×2 小卡；五張迷你趨勢圖皆為近 1 個月、同一風格）
// 2. 歷史走勢（市值變化、損益變化兩張圖，共用區間切換）
// 3. 資產與產業配置（市場別、證券別環形圖；產業別、個股別方塊圖）
// 4. 庫存明細（每檔一列總覽，預設收合，可展開看每筆買進紀錄；右上角也有「新增持股」）
// 5. 歷史分析報告（右上角「進行分析」）
// 組合不存在或不是自己的，導回投資組合頁。無參數。
export default function PortfolioDetail() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<Detail | null>(null); // null＝載入中
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryPoint[] | null>(null); // null＝走勢載入中
  const [historyError, setHistoryError] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set()); // 已展開買進紀錄的代號（預設全部收合）
  const [dialog, setDialog] = useState<Dialog>(null);
  const scrollToHoldings = useRef(false); // 新增持股成功後，等畫面更新完再捲到庫存明細
  const [scrollTick, setScrollTick] = useState(0);

  // 【捲到庫存明細】新增成功、畫面重新畫好後執行一次（尊重「減少動態效果」設定）
  useEffect(() => {
    if (!scrollToHoldings.current) return;
    scrollToHoldings.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("holdings")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [scrollTick]);

  // 【載入走勢】另外呼叫，失敗不影響頁面其他部分
  const loadHistory = useCallback(async () => {
    setHistoryError("");
    try {
      setHistory((await api<{ points: HistoryPoint[] }>(`/portfolios/${portfolioId}/history`)).points);
    } catch (e) {
      setHistoryError(e instanceof ApiError ? e.message : "走勢載入失敗");
    }
  }, [portfolioId]);

  // 【載入明細】取得組合（同時重抓走勢）；404／403 導回投資組合頁，其他錯誤顯示整頁錯誤卡
  const load = useCallback(async () => {
    loadHistory();
    try {
      setData(await api<Detail>(`/portfolios/${portfolioId}`));
      setError("");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 403)) navigate("/portfolios", { replace: true });
      else setError(e instanceof ApiError ? e.message : "載入失敗，請稍後再試");
    }
  }, [portfolioId, navigate, loadHistory]);
  useEffect(() => { setData(null); setHistory(null); load(); }, [load]);

  // 【展開／收合】切換某檔持股的買進紀錄列表。參數：symbol=代號
  function toggle(symbol: string) {
    setOpen((s) => { const n = new Set(s); n.has(symbol) ? n.delete(symbol) : n.add(symbol); return n; });
  }

  if (error) {
    return (
      <main className={styles.page}>
        <BackLink />
        <Card className={`${styles.stateCard} ${styles.whiteCard}`}>
          <Chip variant="error">{error}</Chip>
          <Button variant="outlined" onClick={load}>重試</Button>
        </Card>
      </main>
    );
  }
  // 載入中：只顯示標題（組合名稱）與畫面中間的轉圈圈（DESIGN.md〈Page loading〉）；
  // 名稱由總覽頁的卡片連結帶過來，直接輸入網址進來時還不知道名稱，就只顯示轉圈圈
  if (!data) {
    const pendingName = (location.state as { name?: string } | null)?.name;
    return (
      <main className={styles.page}>
        {pendingName && (
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.nameRow}>
                <h1 className={styles.title}>{pendingName}</h1>
              </div>
            </div>
          </header>
        )}
        <PageSpinner />
      </main>
    );
  }

  const { totals, positions } = data;
  const empty = positions.length === 0;
  const missingPrice = positions.some((p) => p.marketValue == null); // 有持股缺最新報價
  const openAdd = () => setDialog({ kind: "add" });

  // 【新增成功】關閉視窗、重新載入，資料回來後把頁面捲到庫存明細（讓使用者馬上看到剛新增的持股）
  async function afterAdded() {
    setDialog(null);
    await load();
    scrollToHoldings.current = true;
    setScrollTick((n) => n + 1);
  }

  // 迷你趨勢圖資料：用完整走勢算好每天的數值，圖表自己只取最新交易日往前 1 個月
  const hist = history ?? [];
  const pnlOf = (p: HistoryPoint) => Number(p.marketValue) - Number(p.costAmount);
  const series = (f: (p: HistoryPoint, i: number) => number | null): SparkPoint[] => hist.map((p, i) => ({ date: p.date, value: f(p, i) }));
  const mvSeries = series((p) => Number(p.marketValue));
  const costSeries = series((p) => Number(p.costAmount));
  const pnlSeries = series(pnlOf);
  // 每日損益 = 今日損益 − 昨日損益（當天新買進的成本不算賺）；第一筆買進當天一律為 0（與後端「最新日損益」規則一致），
  // 所以累積 2 個交易日就畫得出線
  const dailySeries = series((p, i) => (i === 0 ? 0 : pnlOf(p) - pnlOf(hist[i - 1])));
  const annualSeries = series((p) => p.annualizedReturn);
  // 圖表顏色跟著卡片上的數字顏色走（正紅、負綠）；市值與投入成本的數字不上色，圖表也用中性色
  const signOf = (v: string | number | null) => (v == null ? undefined : Number(v));
  const sparkLabel = "近 1 個月";
  // 累積不到 2 個交易日的資料時畫不出線：總覽只留數字（不放任何圖表、區塊高度跟著縮小），歷史走勢整塊不顯示，也不顯示提示文字。
  // 走勢還在載入中時先保留圖表位置，避免版面跳動
  const showCharts = history === null || history.length >= 2;
  // 資料更新時間：沒有持股或沒有時間時整行不顯示（不顯示「-」或 N/A）
  const updated = !empty && data.dataUpdatedAt ? (
    <><Icon name="schedule" size={16} />資料更新時間：{formatDateTime(data.dataUpdatedAt)}</>
  ) : null;

  return (
    <main className={styles.page}>
      {/* 0. 標題列：名稱與編輯鈕；右側是資料更新時間與「新增持股」（手機版時間移到名稱下方） */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.nameRow}>
            <h1 className={styles.title}>{data.name}</h1>
            <IconButton icon="edit" label="修改組合名稱" onClick={() => setDialog({ kind: "rename" })} />
          </div>
          {updated && <div className={`${styles.metaText} ${styles.metaTextMobile}`}>{updated}</div>}
        </div>
        {/* 右上角：資料更新時間（有持股才有）＋「新增持股」（位置同風險屬性頁的「開始填寫」） */}
        <div className={styles.headerActions}>
          {updated && <div className={`${styles.metaText} ${styles.metaTextDesktop}`}>{updated}</div>}
          <Button onClick={() => openAdd()}>新增持股</Button>
        </div>
      </header>

      {/* 提示語：與投資組合總覽頁相同的液態玻璃提示框；有持股時才顯示 */}
      {!empty && <Notice className={styles.noticeGap}>損益為未實現損益，未納入手續費與交易稅；股價採調整後收盤價（已還原除權息），僅供參考，不構成投資建議。</Notice>}
      {missingPrice && <Notice icon="warning" className={styles.warnNotice}>部分持股缺少最新報價，市值、損益與權重暫時無法計算（配置圖改依投入成本）。</Notice>}


      {empty ? (
        // 沒有持股：與風險屬性頁未填問卷時相同的虛線外框、無背景，只放一句提示（按鈕在右上角）
        <div className={styles.emptyCard}>
          <p className={styles.emptyText}>請點擊右上角「新增持股」，<br className={styles.mobileBreak} />建立完整的庫存明細</p>
        </div>
      ) : (
        <div className={styles.content}>
          {/* 1. 總覽與核心績效指標：一個大外框；左側直接放「目前總市值」（靠左），右側 2×2 小卡 */}
          <Card className={`${styles.whiteCard} ${styles.overview}`} role="region" aria-label="總覽與核心績效指標">
            <div className={styles.hero}>
              <span className={styles.heroLabel}>目前總市值</span>
              <span className={styles.heroValue}>{money(totals.marketValue)}{totals.marketValue != null && <span className={styles.unit}>元</span>}</span>
              {showCharts && (
                <div className={styles.heroChart}>
                  <Sparkline tall blue points={mvSeries} label={`${sparkLabel}市值走勢`} />
                </div>
              )}
            </div>
            <div className={styles.miniGrid}>
              <MetricCard label="總投入成本" value={money(totals.costAmount)} unit="元"
                chart={showCharts && <Sparkline blue points={costSeries} label={`${sparkLabel}投入成本走勢`} />} />
              <MetricCard label="年化報酬率" value={annualText(totals.annualizedReturn, totals.holdingDays, totals.marketValue != null).replace(/%$/, "")}
                unit={totals.annualizedReturn != null ? "%" : undefined}
                color={pnlColor(totals.annualizedReturn)} small={totals.annualizedReturn == null}
                chart={showCharts && <Sparkline points={annualSeries} direction={signOf(totals.annualizedReturn)} label={`${sparkLabel}年化報酬率走勢`} />} />
              <MetricCard label="最新日損益" value={signedMoney(totals.latestDayPnl)} unit="元" color={pnlColor(totals.latestDayPnl)}
                change={totals.latestDayPnlPercent}
                chart={showCharts && <Sparkline points={dailySeries} direction={signOf(totals.latestDayPnl)} label={`${sparkLabel}每日損益`} />} />
              <MetricCard label="歷史總損益" value={signedMoney(totals.unrealizedPnl)} unit="元" color={pnlColor(totals.unrealizedPnl)}
                change={totals.unrealizedReturn}
                chart={showCharts && <Sparkline points={pnlSeries} direction={signOf(totals.unrealizedPnl)} label={`${sparkLabel}累計損益走勢`} />} />
            </div>
          </Card>

          {/* 2. 歷史走勢：最上方區間切換，下面市值變化與損益變化兩張圖（不另放區塊標題）；不足 2 個交易日時整塊不顯示 */}
          {showCharts && (
            <Card className={styles.whiteCard}>
              {historyError ? (
                <div className={styles.inlineState}><Chip variant="error">{historyError}</Chip><Button variant="outlined" onClick={loadHistory}>重試</Button></div>
              ) : history === null ? (
                <div className={styles.chartSkeleton} role="status" aria-label="走勢載入中" />
              ) : (
                <HistoryTrend points={history} />
              )}
            </Card>
          )}

          {/* 3. 資產與產業配置：上排兩張環形圖、下排兩張方塊圖 */}
          <section className={styles.allocGrid} aria-label="資產與產業配置">
            <Card className={styles.whiteCard}><ShareDonut title="市場別" positions={positions} keyOf={(p) => p.market} /></Card>
            <Card className={styles.whiteCard}><ShareDonut title="證券別" positions={positions} keyOf={(p) => p.securityType} /></Card>
            <Card className={styles.whiteCard}><IndustryTreemap positions={positions} /></Card>
            <Card className={styles.whiteCard}><HoldingsHeatmap positions={positions} /></Card>
          </section>

          {/* 4. 庫存明細：每檔一列總覽，最右側按鈕展開每筆買進紀錄（預設收合）；右上角「新增持股」 */}
          <Card id="holdings" className={`${styles.tableCard} ${styles.whiteCard} ${styles.anchor}`}>
            <div className={styles.cardHead}>
              {/* 標題右側接單價說明（比照問卷頁標題旁「共 14 題」的樣式；提示語前加 info 圖示） */}
              <div className={styles.titleWithNote}>
                <h2 className={styles.tableTitle}>庫存明細</h2>
                {/* 說明收在 info 圖示的提示框內，桌機與手機都一樣，版面更乾淨 */}
                <InfoPopover label="每股價格說明">{PRICE_NOTE}。</InfoPopover>
              </div>
              <Button onClick={() => openAdd()}>新增持股</Button>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.left}>代號/名稱<span className={styles.thUnit}>(市場別/產業別)</span></th>
                    <th>平均單價<span className={styles.thUnit}>(元)</span></th>
                    <th>持有數量<span className={styles.thUnit}>(股)</span></th>
                    <th>持有成本<span className={styles.thUnit}>(元)</span></th>
                    <th>最新價格<span className={styles.thUnit}>(元)</span></th>
                    <th>未實現損益<span className={styles.thUnit}>(元)</span></th>
                    <th>年化報酬率<span className={styles.thUnit}>(%)</span></th>
                    <th>市值權重<span className={styles.thUnit}>(元)</span></th>
                    <th aria-label="展開明細" />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, i) => {
                    const isOpen = open.has(p.symbol);
                    return (
                      <Fragment key={p.symbol}>
                        {/* 每檔之間的間隔列（不用 border-spacing，才不會把展開的列與下方明細面板拆開） */}
                        {i > 0 && <tr className={styles.gapRow} aria-hidden="true"><td colSpan={9} /></tr>}
                        <tr className={`${styles.row} ${isOpen ? styles.rowOpen : ""}`} onClick={() => toggle(p.symbol)}>
                          {/* 代號/名稱：代號＋名稱，下方小字為產業 */}
                          <td className={styles.left}>
                            <div className={styles.stock}><span className={styles.code}>{p.symbol}</span><span>{p.name}</span></div>
                            <div className={styles.industry}><span>{p.market}</span><span>{p.industry}</span></div>
                          </td>
                          <td>{decimal(p.averageCost)}</td>
                          <td>{decimal(p.quantity)}</td>
                          <td>{money(p.costAmount)}</td>
                          <td>{p.latestPrice == null ? <span className={styles.subCell}>無報價</span> : decimal(p.latestPrice)}</td>
                          <td style={{ color: pnlColor(p.unrealizedPnl) }}>
                            {signedMoney(p.unrealizedPnl)}<div className={styles.subCell} style={{ color: "inherit" }}><ChangePct v={p.unrealizedReturn} /></div>
                          </td>
                          <td style={{ color: pnlColor(p.annualizedReturn) }}>{annualText(p.annualizedReturn, p.holdingDays, p.marketValue != null).replace(/%$/, "")}</td>
                          {/* 市值權重：上方為目前市值，下方橫條長度代表占組合的權重 */}
                          <td>
                            {money(p.marketValue)}
                            {p.weight != null && <div className={styles.weightBar} title={`權重 ${pct(p.weight)}`}><span style={{ width: `${Math.min(100, p.weight * 100)}%` }} /></div>}
                          </td>
                          <td>
                            <button type="button" className={styles.expand} aria-expanded={isOpen}
                              aria-label={`${isOpen ? "收合" : "展開"} ${p.symbol} 的買進紀錄`}
                              onClick={(e) => { e.stopPropagation(); toggle(p.symbol); }}>
                              <Icon name="expand_more" size={22} />
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className={styles.lotsRow}>
                            <td colSpan={9}>
                              <LotTable position={p}
                                onEdit={(lot) => setDialog({ kind: "editLot", lot: { id: lot.id, symbol: p.symbol, name: p.name, tradeDate: lot.tradeDate, quantity: lot.quantity } })}
                                onRemove={(lot) => setDialog({ kind: "deleteLot", lot })} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 5. 歷史分析報告：右上角「進行分析」；尚無報告時以虛線空白狀態引導 */}
          <Card className={styles.whiteCard}>
            <div className={styles.cardHead}>
              <h2 className={styles.tableTitle}>歷史分析報告</h2>
              <Button onClick={() => navigate(`/analysis?portfolio=${data.id}`)}>進行分析</Button>
            </div>
            <div className={styles.emptyCard}>
              <p className={styles.emptyText}>請點擊右上角「進行分析」，<br className={styles.mobileBreak} />產生第一份分析報告</p>
            </div>
          </Card>
        </div>
      )}

      {/* 彈出視窗 */}
      {dialog?.kind === "add" && (
        <Modal title="新增買進紀錄" onCancel={() => setDialog(null)}>
          <LotForm portfolioId={data.id} onDone={afterAdded} onCancel={() => setDialog(null)} />
        </Modal>
      )}
      {/* 修改買進紀錄：與新增相同的視窗，帶入該筆的股票（不可更改）、日期與數量 */}
      {dialog?.kind === "editLot" && (
        <Modal title="修改買進紀錄" onCancel={() => setDialog(null)}>
          <LotForm portfolioId={data.id} editing={dialog.lot} onDone={() => { setDialog(null); load(); }} onCancel={() => setDialog(null)} />
        </Modal>
      )}
      {dialog?.kind === "rename" && (
        <RenameDialog portfolioId={data.id} current={data.name} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
      )}
      {dialog?.kind === "deleteLot" && (
        <ConfirmDialog title="刪除買進紀錄" confirmLabel="刪除"
          message={`確定刪除 ${dialog.lot.symbol} 於 ${dialog.lot.tradeDate} 買進 ${decimal(dialog.lot.quantity)} 股的這筆紀錄？`}
          onClose={() => setDialog(null)}
          onConfirm={async () => { await api(`/portfolios/${portfolioId}/holding-lots/${dialog.lot.id}`, undefined, "DELETE"); setDialog(null); load(); }} />
      )}
    </main>
  );
}

// 【返回連結】回投資組合清單（錯誤畫面使用）。無參數。
function BackLink() {
  return <Link to="/portfolios" className={styles.back}><Icon name="arrow_back" size={18} />我的投資組合</Link>;
}

// 【指標卡片】總覽區右側的一張數值小卡：粗體標題、數字、下方迷你趨勢圖。
// 參數：label=標題、value=數字、unit=單位（可省略）、color=數字顏色（可省略）、small=數字用較小字級（文字較長時）、
//      change=漲跌幅（比例，如 -0.0807；可省略，給了就在金額下方顯示 ▲／▼ 與百分比）、
//      chart=下方趨勢圖（false＝資料不足、整張卡不放圖表，高度跟著縮小）
function MetricCard({ label, value, unit, color, small, change, chart }: {
  label: string; value: string; unit?: string; color?: string; small?: boolean; change?: number | null; chart: React.ReactNode;
}) {
  // 資料不足、不放圖表時的 N/A：放在數字那一行，與同一列其他卡片的數字水平對齊
  if (value === NA && chart === false) {
    return (
      <div className={styles.smallCard}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={`${styles.metricValue} ${styles.metricNAInline}`}>N/A</span>
      </div>
    );
  }
  // 無法計算（N/A）：不顯示空白的趨勢圖，「N/A」置中於標題下方的整塊區域（數字＋圖表的位置）
  if (value === NA) {
    return (
      <div className={styles.smallCard}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={`${styles.metricValue} ${styles.metricNA}`}>N/A</span>
      </div>
    );
  }
  return (
    <div className={styles.smallCard}>
      <span className={styles.metricLabel}>{label}</span>
      <FitLine className={`${styles.metricValue} ${small ? styles.metricValueSmall : ""}`} color={color}>
        {value}{unit && value !== NA && <span className={styles.unit}>{unit}</span>}
      </FitLine>
      {/* 漲跌幅（金額下方一行）：實心三角箭頭（▲漲、▼跌）＋不帶正負號的百分比；數字字級與顏色跟著金額，% 與「元」同樣是小字單位 */}
      {change != null && (
        <span className={`${styles.metricValue} ${styles.change}`} style={{ color }} aria-label={`${change >= 0 ? "上漲" : "下跌"} ${pct(Math.abs(change))}`}>
          {change !== 0 && <span className={styles.changeArrow}>{change > 0 ? "▲" : "▼"}</span>}{pct(Math.abs(change)).replace("%", "")}<span className={styles.unit}>%</span>
        </span>
      )}
      {chart !== false && <div className={styles.metricChart}>{chart}</div>}
    </div>
  );
}

// 【單行數字】金額一律單行顯示、不換行；卡片太窄放不下時（例如手機上很大的金額）自動把字級等比例縮小到剛好放得下。
// 參數：className=樣式、color=文字顏色、children=內容
function FitLine({ className, color, children }: { className: string; color?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null); // 縮小後的字級（px）；null＝用原本的字級
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    // 1. 以原始字級量出內容寬度，與卡片可用寬度比較，放不下才縮小
    const measure = () => {
      el.style.fontSize = "";
      const base = parseFloat(getComputedStyle(el).fontSize);
      const need = el.scrollWidth;
      const cs = getComputedStyle(box);
      const room = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setSize(need > room && need > 0 ? Math.floor(base * (room / need) * 10) / 10 : null);
    };
    measure();
    // 2. 卡片寬度改變（旋轉螢幕、調整視窗）時重新計算
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [children]);
  return (
    <span ref={ref} className={`${className} ${styles.fitLine}`}
      style={{ color, fontSize: size ? `${size}px` : undefined }}>
      {children}
    </span>
  );
}

// 【買進紀錄明細面板】展開某檔持股後，在該列下方顯示「歷史批次買進明細」：每筆一列（買進日期、每股價格、買進股數、持有成本、
// 未實現損益與報酬率、目前市值、持有天數），右側可修改（開啟與新增相同的彈出視窗）或刪除（先確認）。
// 參數：position=該檔持股、onEdit=按下修改、onRemove=按下刪除
function LotTable({ position, onEdit, onRemove }: {
  position: Position; onEdit: (l: Lot) => void; onRemove: (l: Lot) => void;
}) {
  // 計算持有天數
  const getHoldingDays = (tradeDate: string) => {
    const d = new Date(tradeDate);
    const t = new Date(todayTaipei());
    return Math.max(0, Math.floor((t.getTime() - d.getTime()) / 86400000));
  };

  return (
    <div className={styles.lots}>
      <div className={styles.lotsHeader}>
        <div className={styles.lotsTitle}>歷史批次買進明細</div>
        <div className={styles.lotsCount}>{position.lots.length} 筆交易紀錄</div>
      </div>
      
      <div className={styles.lotGrid}>
        <div className={styles.lotsHeaderRow}>
          <div className={styles.colDate}>買進日期</div>
          <div>每股價格</div>
          <div>買進股數</div>
          <div>持有成本</div>
          <div>未實現損益</div>
          <div>目前市值</div>
          <div>持有天數</div>
          <div>操作</div>
        </div>
        {position.lots.map((l) => (
          <div key={l.id} className={styles.lotRow}>
            <div className={styles.colDate}>{l.tradeDate}</div>
            <div>{decimal(l.unitCost)}</div>
            <div>{decimal(l.quantity)}</div>
            <div>{money(l.costAmount)}</div>
            <div className={styles.pnlText} style={{ color: pnlColor(l.unrealizedPnl) }}>
              {signedMoney(l.unrealizedPnl)}
              <div className={styles.subCell} style={{ color: "inherit" }}><ChangePct v={l.unrealizedReturn} /></div>
            </div>
            <div>{money(l.marketValue)}</div>
            <div>{getHoldingDays(l.tradeDate)}</div>
            <div className={styles.colActions}>
              <div className={styles.lotActions}>
                <IconButton icon="edit" label={`修改 ${l.tradeDate} 這筆`} onClick={() => onEdit(l)} />
                <IconButton icon="delete" label={`刪除 ${l.tradeDate} 這筆`} onClick={() => onRemove(l)} className={styles.dangerSolid} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 【漲跌幅文字】表格內的報酬率：實心三角箭頭（▲漲、▼跌，較小）＋不帶正負號的數字＋小字 %；箭頭、數字與 % 的顏色都跟著外層的漲跌色。參數：v=報酬率（比例）
function ChangePct({ v }: { v: number | null }) {
  if (v == null) return <>-</>;
  return (
    <>
      {v !== 0 && <span className={styles.changeArrow}>{v > 0 ? "▲" : "▼"}</span>}
      {pct(Math.abs(v)).replace("%", "")}
      <span className={`${styles.unit} ${styles.unitTone}`}>%</span>
    </>
  );
}
