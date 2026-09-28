import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import {
  AnalysisReport as Report, AnalysisResult, BENCHMARK_FULL, benchmarkOf, CHART_TERMS, metricParts, compareText, Figure, METRIC_CARDS,
  metricText, PROFILE_LABELS, rateLabel, REPORT_NOTICE, ReportContent, SECTION_TITLES, SORTINO_HINTS,
} from "../analysis";
import { formatDateTime, NA } from "../format";
import AnalyzingGlow from "../components/AnalyzingGlow";
import { CorrelationHeatmap, DrawdownChart, DrawdownTable, WeightPcrChart } from "../components/AnalysisCharts";
import HoldingsTable, { HoldingRow } from "../components/HoldingsTable";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Chip from "../components/ui/Chip";
import Icon from "../components/ui/Icon";
import InfoPopover from "../components/ui/InfoPopover";
import Notice from "../components/ui/Notice";
import PageSpinner from "../components/ui/PageSpinner";
import { toggleKeepingPlace } from "../keepInPlace";
import styles from "./AnalysisReport.module.css";

const POLL_MS = 2000; // 報告產生中時，每 2 秒重取一次
const POLL_MAX = 130; // 最多等約 4 分鐘多（涵蓋後端最多 3 次呼叫與重試間隔），之後停止等待
const TOP_HOLDINGS = 5; // 庫存明細預設顯示的檔數（依風險貢獻比例由大到小），其餘收合
const SECTION_ORDER = ["loss_risk", "concentration", "return_market", "personal_alignment"]; // 畫面上的四段順序（報酬效率與市場連動放在個人投資條件適配度上方）
const SECTION_FIGURES: Record<string, Figure["figure_ref"][]> = { // 各段下方附的圖（與 Prompt 的綁定一致）
  loss_risk: ["figure:drawdown_curve"],
  concentration: ["figure:correlation_heatmap", "figure:weight_vs_pcr"], // 相關係數在上、風險貢獻度在下
};

// 【取一段報告文字】Prompt 1.1.0 起「風險與報酬」與「市場敏感與風險來源」合併為 return_market；
// 較早產生的報告沒有這段，改接兩段舊文字，舊報告仍能完整顯示。參數：content=AI 報告、key=段落代號
function sectionText(content: ReportContent | null, key: string): string | undefined {
  const find = (k: string) => content?.sections.find((s) => s.key === k)?.text;
  if (key !== "return_market") return find(key);
  return find("return_market") ?? ([find("risk_return"), find("market_sensitivity")].filter(Boolean).join("") || undefined);
}

// 【風險分析報告頁】/history/{分析編號}（放在歷史紀錄底下）：一次分析的唯讀快照加上 AI 報告。
// 由上而下：固定提示語 → 分析條件 → 綜合診斷 → 風險指標（六張卡，含大盤對照與名詞解釋）
// → 四段說明（虧損風險附回撤走勢、集中與分散附相關係數與風險貢獻度（上下排列）、報酬效率與市場連動、個人投資條件適配度）
// → 建議檢視重點（三項）→ 庫存明細（目前的庫存，前 5 檔）。報告產生中時比照風險屬性頁：只顯示標題、提示語、轉圈圈與外框光暈，完成後一次顯示；
// 產生失敗時數字與圖表照常顯示，解說區塊顯示「重新產生」。無參數。
export default function AnalysisReport() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [portfolio, setPortfolio] = useState<{ name: string; positions: HoldingRow[] } | null>(null); // 投資組合名稱與目前庫存
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [gaveUp, setGaveUp] = useState(false); // 等太久仍未產生報告
  const [regenerating, setRegenerating] = useState(false); // 按了「重新產生」、等待結果中
  const [regenError, setRegenError] = useState("");
  const [pollKey, setPollKey] = useState(0); // 每按一次「重新產生」加 1，重新啟動輪詢
  const tries = useRef(0);

  // 【載入分析快照與投資組合】組合的名稱與目前庫存另外查（查不到時名稱顯示 N/A、庫存為空）；找不到或不是自己的分析，顯示錯誤卡
  useEffect(() => {
    setResult(null);
    setError("");
    api<AnalysisResult>(`/analysis/${analysisId}`)
      .then((r) => {
        setResult(r);
        api<{ name: string; positions: HoldingRow[] }>(`/portfolios/${r.portfolio_id}`)
          .then((p) => setPortfolio({ name: p.name, positions: p.positions }))
          .catch(() => setPortfolio({ name: NA, positions: [] }));
      })
      .catch((e) => setError(e instanceof ApiError && (e.status === 404 || e.status === 403) ? "找不到這份分析報告" : "無法載入分析報告，請稍後再試"));
  }, [analysisId]);

  // 【載入並輪詢報告】報告仍是 pending 就隔 2 秒再取，直到完成、失敗或超過等待上限
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    async function load() {
      try {
        const r = await api<Report>(`/analysis/${analysisId}/report`);
        if (stopped) return;
        setReport(r);
        if (r.status !== "pending") setRegenerating(false);
        else if (++tries.current >= POLL_MAX) {
          setGaveUp(true);
          setRegenerating(false);
        } else timer = window.setTimeout(load, POLL_MS);
      } catch {
        if (!stopped) setReport({ analysis_id: Number(analysisId), status: "failed", attempt: null, content: null });
      }
    }
    load();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [analysisId, pollKey]);

  // 【重新產生】報告失敗時再要一次：成功送出後解說區塊顯示「產生中…」並輪詢；太頻繁（429）等錯誤顯示在按鈕旁
  async function regenerate() {
    setRegenError("");
    try {
      await api(`/analysis/${analysisId}/report/regenerate`, {});
      tries.current = 0;
      setGaveUp(false);
      setRegenerating(true);
      setPollKey((k) => k + 1);
    } catch (e) {
      setRegenError(e instanceof ApiError ? e.message : "無法連線，請稍後再試");
    }
  }

  // 熱圖提示框用的代號→名稱；用 useMemo 讓圖表在頁面其他狀態改變（例如展開庫存）時不必重畫
  const names = useMemo(() => Object.fromEntries((result?.positions ?? []).map((p) => [p.symbol, p.name])), [result]);

  const title = <h1 className={styles.title}>風險分析報告</h1>;
  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>{title}</div>
        <Card className={styles.section}>
          <Chip variant="error">{error}</Chip>
          <Button variant="outlined" onClick={() => navigate("/history")}>回到歷史紀錄</Button>
        </Card>
      </main>
    );
  }
  // 資料載入中：只顯示標題與轉圈圈（DESIGN.md〈Page loading〉）
  if (!result || !report || !portfolio) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>{title}</div>
        <PageSpinner />
      </main>
    );
  }
  const notice = <Notice className={styles.noticeGap}>{REPORT_NOTICE}</Notice>;
  // 報告產生中（第一次產生，不是按「重新產生」）：與風險屬性頁相同，只顯示標題、提示語、轉圈圈（與風險屬性頁同一個位置）與外框光暈，不先顯示數字與圖表
  if (report.status === "pending" && !gaveUp && !regenerating) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>{title}</div>
        {notice}
        <PageSpinner inline label="分析解說產生中" />
        <AnalyzingGlow />
      </main>
    );
  }

  const content = report.status === "ready" && !regenerating ? report.content : null;
  const rate = rateLabel(result.settings.rate_option, result.settings.risk_free_rate);
  const figures = Object.fromEntries(result.figures.map((f) => [f.figure_ref, f])) as Record<string, Figure>;
  const time = <><Icon name="schedule" size={16} />分析時間：{formatDateTime(result.created)}</>;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {title}
          <div className={`${styles.metaText} ${styles.metaMobile}`}>{time}</div>
        </div>
        <div className={`${styles.metaText} ${styles.metaDesktop}`}>{time}</div>
      </div>

      {/* 0. 固定提示語（使用限制） */}
      {notice}

      {/* 1. 分析條件：這次分析採用的組合、期間、報酬比較基準與三項個人條件 */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>分析條件</h2>
        <dl className={styles.conditions}>
          <Condition label="投資組合">{portfolio.name}</Condition>
          <Condition label="分析期間">
            <span><span className={styles.nowrap}>{result.period.start_date} ～</span> <span className={styles.nowrap}>{result.period.end_date}</span></span>
          </Condition>
          <Condition label="報酬比較基準">{rate}</Condition>
          {Object.entries(PROFILE_LABELS).map(([k, label]) => (
            <Condition key={k} label={label} adjusted={result.profile_inputs.changed_fields.includes(k)}>
              {result.profile_inputs[k as "investment_horizon"] ?? NA}
            </Condition>
          ))}
        </dl>
      </Card>

      {/* 2. 綜合診斷（AI）；報告未完成時改為解說狀態卡 */}
      {content ? (
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>綜合診斷</h2>
          <div className={styles.features}>
            {content.overall.features.map((f) => <span key={f} className={styles.feature}>{f}</span>)}
          </div>
          <p className={styles.paragraph}>{content.overall.text}</p>
          <div className={`${styles.statusPanel} ${styles.focusPanel}`}>
            <Icon name="warning" size={20} />
            <div>
              <p className={styles.panelTitle}>最需要關注</p>
              <p>{content.overall.focus}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>分析解說</h2>
          {regenerating ? (
            <p className={styles.helper}>產生中…</p>
          ) : report.status === "pending" ? (
            <p className={styles.helper}>分析解說產生時間較長，請稍後重新整理本頁。</p>
          ) : (
            <div className={styles.failedRow}>
              <div className={`${styles.statusPanel} ${styles.warnPanel}`}>
                <Icon name="warning" size={20} />
                <div><p>AI 分析解說暫時無法產生，下方的數字與圖表不受影響，請按「重新產生」再試一次。</p></div>
              </div>
              <Button variant="outlined" onClick={regenerate}>重新產生</Button>
            </div>
          )}
          {regenError && <Chip variant="error">{regenError}</Chip>}
        </Card>
      )}

      {/* 3. 風險指標：六張卡，與大盤比較用白話標示；名詞解釋收在說明圖示 */}
      <Card className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>風險指標</h2>
          <InfoPopover label="比較基準說明">所有比較都以同一段期間的{BENCHMARK_FULL}為基準。</InfoPopover>
        </div>
        <div className={styles.metricGrid}>
          {METRIC_CARDS.map((def) => {
            const m = result.metrics[def.key];
            const cmp = compareText(result, def);
            return (
              <div key={def.key} className={styles.metricTile}>
                <div className={styles.metricHead}>
                  <span className={styles.metricLabel}>{def.label}</span>
                  <InfoPopover label={`${def.label}說明`} className={styles.metricInfo}>
                    <p className={styles.popTitle}>{def.fullName}</p>
                    <p className={styles.popPara}><b>名詞解釋：</b>{def.term}</p>
                    <p className={styles.popPara}><b>閱讀指引：</b>{def.guide}</p>
                  </InfoPopover>
                  {/* 與大盤比較的標籤：桌機放在右上角；手機放在大盤數值下方（見下方 compareMobile） */}
                  {m?.status !== "unavailable" && cmp && <span className={`${styles.compare} ${styles.compareDesktop}`}>{cmp}</span>}
                </div>
                <span className={styles.metricValue}>
                  {metricParts(m?.value, def.kind).num}
                  {metricParts(m?.value, def.kind).unit && <span className={styles.unit}>%</span>}
                </span>
                {m?.status === "unavailable" ? (
                  <span className={styles.metricSub}>{m.reason}</span>
                ) : (
                  <>
                    <span className={styles.metricSub}>大盤 {metricText(benchmarkOf(def.key, m), def.kind)}</span>
                    {cmp && <span className={`${styles.compare} ${styles.compareMobile}`}>{cmp}</span>}
                  </>
                )}
              </div>
            );
          })}
          {/* 索丁諾提示：放在六張指標卡下方、撐滿整列（桌機與手機相同） */}
          {result.interpretation.sortino_preferred && SORTINO_HINTS[result.interpretation.skew_class] && (
            <div className={`${styles.statusPanel} ${styles.infoPanel} ${styles.hintPanel}`}>
              <Icon name="info" size={20} />
              <div><p>{SORTINO_HINTS[result.interpretation.skew_class]}</p></div>
            </div>
          )}
        </div>
      </Card>

      {/* 4. 四段說明；有圖的段落附圖（報告未完成時只顯示圖） */}
      {SECTION_ORDER.map((key) => {
        const text = sectionText(content, key);
        const figs = SECTION_FIGURES[key] ?? [];
        if (!text && figs.length === 0) return null;
        return (
          <Card key={key} className={styles.section}>
            <h2 className={styles.sectionTitle}>{SECTION_TITLES[key]}</h2>
            {text && <p className={styles.paragraph}>{text}</p>}
            {figs.length > 0 && (
              <div className={styles.chartStack}>
                {figs.map((ref) => (
                  <ChartBlock key={ref} figure={figures[ref]} render={(head) => (
                    // 回撤走勢（讀數）與風險貢獻度（圖例）要在標題列右側放東西，所以標題交給圖表自己排版
                    ref === "figure:drawdown_curve" ? (
                      figures[ref]?.data && <><DrawdownChart data={figures[ref].data!} head={head} /><DrawdownTable data={figures[ref].data!} /></>
                    ) : ref === "figure:weight_vs_pcr" ? (
                      <WeightPcrChart positions={result.positions} head={head} />
                    ) : (
                      <>
                        {head}
                        <CorrelationHeatmap symbols={result.correlation.symbols} names={names} matrix={result.correlation.matrix} />
                      </>
                    )
                  )} />
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {/* 5. 建議檢視重點（AI，固定 3 項） */}
      {content && content.review_directions.length > 0 && (
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>建議檢視重點</h2>
          <ol className={styles.directions}>
            {content.review_directions.map((d, i) => (
              <li key={i}><span className={styles.numberPill}>{String(i + 1).padStart(2, "0")}</span><p>{d.text}</p></li>
            ))}
          </ol>
        </Card>
      )}

      {/* 6. 庫存明細：與投資組合詳情頁的庫存清單相同（不能展開買進紀錄），前 5 檔，其餘收合 */}
      <HoldingsCard positions={portfolio.positions} />

      {regenerating && <AnalyzingGlow />}
    </main>
  );
}


// 【庫存明細】投資組合目前的庫存，欄位與投資組合詳情頁的庫存明細相同，但不能展開買進紀錄。
// 預設只顯示前 5 檔（與詳情頁相同順序），其餘以下方的展開／收合按鈕切換（收合時畫面停在按鈕原本的位置）。參數：positions=目前庫存
function HoldingsCard({ positions }: { positions: HoldingRow[] }) {
  const [open, setOpen] = useState(false);
  const rest = positions.length - TOP_HOLDINGS;
  return (
    // 沒有展開按鈕時表格就是最後一項：比照投資組合頁，最後一列到卡片下緣只留 8px
    <Card className={rest > 0 ? styles.section : `${styles.section} ${styles.tableLast}`}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>庫存明細</h2>
        <InfoPopover label="庫存明細說明">
          這是投資組合目前的庫存，與「投資組合」頁的庫存明細相同。分析使用的權重以分析期間最後一天的市值計算，若分析後有買賣，兩者可能不同。
        </InfoPopover>
      </div>
      {positions.length === 0 ? (
        <p className={styles.helper}>{NA}</p>
      ) : (
        <div className={styles.holdings}><HoldingsTable positions={open ? positions : positions.slice(0, TOP_HOLDINGS)} /></div>
      )}
      {rest > 0 && (
        <button type="button" className={styles.expandToggle} aria-expanded={open} onClick={(e) => toggleKeepingPlace(e.currentTarget, open, () => setOpen((v) => !v))}>
          {open ? "收合" : `顯示其餘 ${rest} 檔`}
          <Icon name="expand_more" size={20} className={open ? styles.flip : undefined} />
        </button>
      )}
    </Card>
  );
}

// 【一項分析條件】名稱在上、值在下；被調整過的個人條件在名稱後加「已調整」膠囊。
// 參數：label=名稱、adjusted=是否為本次調整過的值、children=值
function Condition({ label, adjusted, children }: { label: string; adjusted?: boolean; children: React.ReactNode }) {
  return (
    <div className={styles.condition}>
      <dt>{label}{adjusted && <span className={styles.adjusted}>已調整</span>}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// 【一張圖的區塊】標題（旁邊的說明框與指標卡相同：完整名稱、名詞解釋、閱讀指引）與圖；圖的下方不放文字，
// 本次資料的觀察由 AI 寫在上方段落。圖無法呈現時改顯示原因。
// 參數：figure=圖的描述、render=畫出標題與圖（拿到做好的標題列，由各圖決定放哪裡；回撤走勢要在標題列右側放讀數）
function ChartBlock({ figure, render }: { figure?: Figure; render: (head: React.ReactNode) => React.ReactNode }) {
  if (!figure) return null;
  const terms = CHART_TERMS[figure.figure_ref];
  const title = terms?.title ?? figure.title;
  const head = (
    <div className={styles.chartHead}>
      <h3 className={styles.chartTitle}>{title}</h3>
      {terms && (
        <InfoPopover label={`${title}說明`}>
          <p className={styles.popTitle}>{terms.fullName}</p>
          <p className={styles.popPara}><b>名詞解釋：</b>{terms.term}</p>
          <p className={styles.popPara}><b>閱讀指引：</b>{terms.guide}</p>
        </InfoPopover>
      )}
    </div>
  );
  return (
    <div className={styles.chartBlock}>
      {figure.status === "available" ? render(head) : (
        <>
          {head}
          <div className={`${styles.statusPanel} ${styles.infoPanel}`}>
            <Icon name="info" size={20} />
            <div><p>{figure.reason}</p></div>
          </div>
        </>
      )}
    </div>
  );
}
