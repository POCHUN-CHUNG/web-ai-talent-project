import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { HeatMap } from "@nivo/heatmap";
import { ResponsiveLine } from "@nivo/line";
import { AnalysisPosition } from "../analysis";
import { NA, pct } from "../format";
import { toggleKeepingPlace } from "../keepInPlace";
import { DATE_PILL_W, niceRange, PILL_H, tickText, TREND_MARGIN, trendTicks, useMaxTicks } from "./PortfolioCharts";
import Icon from "./ui/Icon";
import styles from "./AnalysisCharts.module.css";
import pstyles from "./PortfolioCharts.module.css"; // 回撤走勢與熱圖色條沿用投資組合頁圖表的樣式，外觀才會一致

// 【風險分析報告的三張圖】回撤走勢（@nivo/line）、風險貢獻度（@nivo/bar）、相關係數（@nivo/heatmap 熱圖）。
// 規格見 spec/04-behavior.md §4.4.4～§4.4.7；顏色一律讀自 tokens.css，不寫死色碼，並與投資組合頁的圖表同一組色系（品牌藍、琥珀、中性灰；回撤為台股慣例的紅色）。
// 互動與投資組合頁的方塊圖相同：滑過或點按的長條／格子會往四周微微放大（間距比放大幅度大，放大後不會碰到相鄰的格子）。
// 每張圖都附一個畫面上看不到的資料表，供螢幕報讀與列印使用（FR-34）。

const TOP_ROWS = 5; // 風險貢獻度預設顯示的持股數（依風險貢獻比例由大到小）
const BAR_ROW = 64; // 風險貢獻度每檔持股（兩條長條）佔的高度（px）
const BAR_FONT = 14; // 風險貢獻度的軸文字與長條末端百分比的字級（px，比其他圖的 12px 大一級，較好閱讀）
const GROW = 2; // 滑過時長條／格子往外放大的像素（以同色外框放大，四周各 2px）
const GAP = 6; // 長條之間、熱圖格子之間的間距（px）：比放大幅度大，放大後與相鄰的格子仍保留 4px 空隙
const MAX_LINE_POINTS = 800; // 回撤走勢最多畫幾個點（資料很長時抽樣，最低點與頭尾一定保留；圖表本體只畫一次，滑動時不重畫，點數多也不會卡）
const HEAT_MAX_FIT = 20; // 熱圖不超過 20 檔時格子撐滿寬度；超過時固定格寬並可左右捲動
const HEAT_FIXED_CELL = 48; // 超過 20 檔時的固定格寬（px，含間距）
const HEAT_ROW = 34; // 每一列的高度上限（px，含間距）：格子夠寬時是扁長方形，整張圖比正方形格子緊湊
const HEAT_MIN_ROW = 18; // 每一列的高度下限（px，含間距）：手機格子很窄時列高跟著縮小，格子接近正方形，不會變成細長條
const HEAT_MIN_LABEL = 28; // 格寬小於此值時不在格內標數值，改由滑過／點按的提示框顯示（px，不含間距）
const HEAT_SMALL_CELL = 36; // 格寬小於此值時格內數字改用 11px（px，不含間距）
const HEAT_ROTATE_BELOW = 44; // 格寬小於此值時，上方的代號改為直排（橫排會互相重疊，px，含間距）
const MUTE = 0.2; // 熱圖兩端混入 20% 中性灰，顏色較柔和（與投資組合頁的個股別熱力圖相同）

// 【讀取設計 token】Nivo 需要實際色碼，從 tokens.css 讀出變數值。參數：name=CSS 變數名稱
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// 【三張圖共用的顏色與主題】一次讀好要用的 token（色系與投資組合頁的圖表相同）。無參數。
function useTokens() {
  return useMemo(() => {
    const text = token("--color-on-surface-variant");
    const mute = token("--color-neutral-400");
    return {
      weight: token("--color-chart-1"), // 權重（品牌藍，與投資組合頁的第 1 類別色相同）
      pcr: token("--color-chart-2"), // 風險貢獻比例（琥珀，第 2 類別色）
      loss: token("--color-error"), // 回撤線與面積（台股慣例的「跌」，與投資組合頁損益變化的紅色相同）
      zero: token("--color-neutral-500"), // 回撤走勢的 0% 基準線（與投資組合頁走勢圖的基準線相同）
      outline: token("--color-outline"),
      rule: token("--color-outline-variant"),
      ink: token("--color-on-surface"),
      inkInverse: token("--color-inverse-on-surface"),
      surface: token("--color-surface"),
      // 熱圖發散色階（與投資組合頁個股別熱力圖同一組藍黃）：−1 琥珀、0 中性灰、+1 藍（§4.4.4）
      heat: [
        [-1, mix(token("--color-tertiary-500"), mute, MUTE)],
        [0, token("--color-neutral-200")],
        [1, mix(token("--color-primary-400"), mute, MUTE)],
      ] as [number, string][],
      diagonal: "transparent", // 熱圖對角線（自己與自己）：透明，只標「—」
      missing: token("--color-outline-variant"), // 熱圖缺值
      theme: {
        text: { fontSize: 12, fill: text, fontFamily: token("--font-family") },
        axis: { ticks: { text: { fill: text }, line: { stroke: "transparent" } }, domain: { line: { stroke: "transparent" } } },
        grid: { line: { stroke: token("--color-outline-variant"), strokeWidth: 1 } },
      },
    };
  }, []);
}

// 【混色】把兩個 #rrggbb 依比例混合。參數：a=起點色、b=終點色、t=0～1
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

// 【相對亮度】WCAG 公式，用來決定格內文字用深色或淺色。參數：hex=#rrggbb
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// 【對比值】兩色的 WCAG 對比。參數：a、b=#rrggbb
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// 【日期字串轉日期】YYYY-MM-DD 轉成本地日期（避免時區差一天）。參數：s=日期字串
function toDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 【圖表提示框】滑過圖表時顯示的小卡。參數：children=內容
function Tip({ children }: { children: React.ReactNode }) {
  return <div className={styles.tooltip}>{children}</div>;
}

// ─────────────────────────── 1. 回撤走勢 ───────────────────────────

type DrawdownData = { series: { date: string; drawdown: number }[]; trough: { date: string; drawdown: number } };
type DrawRow = { date: string; x: Date; y: number };
type DrawScales = { x: (d: Date) => number; y: (v: number) => number; w: number; h: number };
type DrawAxis = { ticks: Date[]; format: (v: Date | number | string) => string };

// 【回撤文字】「−30.44」（全形減號、小數 2 位，不含 %）；0 時為「0.00」。參數：v=回撤（≤ 0 的比例）
function drawText(v: number): string {
  return v === 0 ? "0.00" : "−" + pct(Math.abs(v)).replace("%", "");
}

// 【回撤走勢圖】與投資組合頁「歷史走勢」同一種設計與互動：縱軸刻度靠圖表框左緣、上下限線與 0% 基準線、
// 滑過（手機點按或按住拖曳）時出現垂直線與該日的點、下方標出日期，右上角的讀數顯示該日回撤（只在滑過時顯示，平常隱藏）。
// 顏色為紅色（線與淡色面積，台股慣例的「跌」），最低點另標「最大回撤 −XX.XX%」與日期。
// 效能：圖表本體只在資料改變時才重畫；垂直線畫在上方另一層、每個畫面最多更新一次，滑動才順。
// 參數：data=回撤資料（series、trough）、head=圖表標題（含說明圖示），與讀數放在同一列
export function DrawdownChart({ data, head }: { data: DrawdownData; head: React.ReactNode }) {
  const t = useTokens();
  const maxTicks = useMaxTicks();
  const [hover, setHover] = useState<number | null>(null);
  // 視窗大小改變時圖表會重新排版，清掉垂直線，避免留在舊的位置
  useEffect(() => {
    const clear = () => setHover(null);
    window.addEventListener("resize", clear);
    return () => window.removeEventListener("resize", clear);
  }, []);
  // 1. 資料點很多時抽樣（最低點、第一天與最後一天一定保留）
  const rows: DrawRow[] = useMemo(() => {
    const s = data.series;
    const step = Math.max(1, Math.ceil(s.length / MAX_LINE_POINTS));
    return s.filter((p, i) => i % step === 0 || i === s.length - 1 || p.date === data.trough.date)
      .map((p) => ({ date: p.date, x: toDate(p.date), y: p.drawdown }));
  }, [data]);
  // 2. 時間軸刻度（與投資組合頁的走勢圖同一套規則）
  const axis: DrawAxis = useMemo(() => {
    const { ticks, step } = trendTicks(rows, maxTicks);
    const crossYear = rows[0].x.getFullYear() !== rows[rows.length - 1].x.getFullYear();
    return { ticks, format: (v) => tickText(v as Date, ticks.findIndex((d) => d.getTime() === (v as Date).getTime()), step, crossYear) };
  }, [rows, maxTicks]);
  const scales = useRef<DrawScales | null>(null); // 底層圖表畫好後回報的座標換算（不觸發重畫）
  const shown = rows[hover ?? rows.length - 1];
  const troughText = `最大回撤 ${drawText(data.trough.drawdown)}%`;

  return (
    <div className={styles.drawdown}>
      {/* 標題列：標題在左、讀數在右（與繪圖區右緣切齊） */}
      <div className={pstyles.trendCaption}>
        {head}
        {/* 讀數只在滑過（手機點按或拖曳）圖表時顯示；平常隱藏但保留位置，標題列高度不跳動 */}
        <span className={pstyles.readout} style={{ marginRight: TREND_MARGIN.right, visibility: hover == null ? "hidden" : "visible" }}>
          <span className={pstyles.readItem} style={{ color: t.loss }}>回撤<b>{drawText(shown.y)}</b>%</span>
        </span>
      </div>
      <div className={`${pstyles.trendBox} ${styles.lineBox}`} role="img" aria-label={`回撤走勢，${troughText}，發生於 ${data.trough.date}`}>
        <DrawdownBase rows={rows} axis={axis} trough={data.trough} troughText={troughText} scales={scales} />
        <DrawdownCross rows={rows} hover={hover} setHover={setHover} scales={scales} />
      </div>
    </div>
  );
}

// 【回撤走勢本體】紅色線與淡紅面積（由線填到 0%）、上下限線與 0% 基準線、靠左的縱軸刻度、最低點標記。
// 用 memo 包起來：垂直線移動時不會重畫這一層。參數：rows=資料點、axis=時間軸刻度、trough／troughText=最低點與標籤、scales=回報座標換算用的容器
const DrawdownBase = memo(function DrawdownBase({ rows, axis, trough, troughText, scales }: {
  rows: DrawRow[]; axis: DrawAxis; trough: { date: string; drawdown: number }; troughText: string;
  scales: React.MutableRefObject<DrawScales | null>;
}) {
  const t = useTokens();
  // 縱軸：上限 0%，下限取整齊的刻度並貼近最大回撤（與投資組合頁走勢圖相同的算法）
  const { yMin, ticks: yTicks, step: yStep } = niceRange(Math.min(trough.drawdown, -0.0001), 0);
  const digits = Math.max(0, -Math.floor(Math.log10(yStep * 100) + 1e-9)); // 刻度間隔 2.5% 這類數字才顯示小數
  const yText = (v: number) => (v === 0 ? "0%" : `${(v * 100).toFixed(digits)}%`);
  const font = t.theme.text.fontFamily;
  const fs = t.theme.text.fontSize;
  return (
    <ResponsiveLine
      data={[{ id: "回撤", data: rows.map((r) => ({ x: r.x, y: r.y })) }]}
      margin={TREND_MARGIN}
      xScale={{ type: "time", precision: "day", min: rows[0].x, max: rows[rows.length - 1].x }}
      yScale={{ type: "linear", min: yMin, max: 0 }}
      curve="monotoneX"
      enablePoints={false}
      isInteractive={false}
      enableGridX={false}
      enableGridY={false}
      axisLeft={null}
      axisBottom={{ tickValues: axis.ticks, format: axis.format }}
      theme={t.theme}
      animate={false}
      layers={["axes",
        // 1. 縱軸刻度文字：靠左對齊圖表框最左緣（與投資組合頁的走勢圖相同）
        ({ yScale }) => (
          <g key="yTicks">
            {yTicks.map((v) => (
              <text key={v} x={-TREND_MARGIN.left} y={(yScale as (n: number) => number)(v)} textAnchor="start" dominantBaseline="central"
                fill={t.theme.text.fill} fontSize={fs} fontFamily={font}>{yText(v)}</text>
            ))}
          </g>
        ),
        // 2. 下限線（淡色）與 0% 基準線（中性灰）
        ({ innerWidth, innerHeight }) => (
          <g key="rules">
            <line x1={0} x2={innerWidth} y1={innerHeight} y2={innerHeight} stroke={t.rule} strokeWidth={1} />
            <line x1={0} x2={innerWidth} y1={0} y2={0} stroke={t.zero} strokeWidth={1} />
          </g>
        ),
        // 3. 面積（線色 14% 不透明度，由線填到 0%）與紅色線
        ({ series, lineGenerator, yScale }) => {
          const p = series[0].data.map((d) => d.position);
          if (p.length < 2) return null;
          const line = lineGenerator(p) ?? "";
          const zero = (yScale as (v: number) => number)(0);
          return (
            <g key="lines">
              <path d={`${line}L${p[p.length - 1].x},${zero}L${p[0].x},${zero}Z`} fill={t.loss} fillOpacity={0.14} />
              <path d={line} fill="none" stroke={t.loss} strokeWidth={2} />
            </g>
          );
        },
        // 4. 最低點：圓點、1px 虛線連到橫軸，旁邊一塊白底圓角標籤（「最大回撤 −XX.XX%」與日期兩行），蓋在曲線與面積上方也看得清楚；
        //    標籤放在點的右邊，右側空間不夠時改放左邊，上下左右都留在圖內
        ({ xScale, yScale, innerHeight, innerWidth }) => {
          const x = (xScale as (v: Date) => number)(toDate(trough.date));
          const y = (yScale as (v: number) => number)(trough.drawdown);
          const pad = 8; // 標籤內距（px）
          const w = fs * 9 + pad * 2; // 「最大回撤 −30.44%」約 9 個字寬
          const h = fs * 1.3 * 2 + pad; // 兩行文字的高度
          const right = x + 10 + w <= innerWidth || x - 10 - w < -TREND_MARGIN.left;
          const bx = right ? Math.min(x + 10, innerWidth - w) : x - 10 - w;
          const by = Math.min(Math.max(y - h - 6, 0), innerHeight - h); // 優先放在點的上方
          return (
            <g key="trough">
              <line x1={x} x2={x} y1={y} y2={innerHeight} stroke={t.outline} strokeDasharray="3 3" />
              <rect x={bx} y={by} width={w} height={h} rx={8} fill={t.surface} fillOpacity={0.92} stroke={t.rule} />
              <text x={bx + pad} y={by + pad / 2 + fs} fill={t.ink} fontSize={fs} fontFamily={font}>
                <tspan fontWeight={700}>{troughText}</tspan>
                <tspan x={bx + pad} dy={fs * 1.3}>{trough.date}</tspan>
              </text>
              <circle cx={x} cy={y} r={5} fill={t.loss} stroke={t.surface} strokeWidth={1.5} />
            </g>
          );
        },
        // 5. 回報座標換算給垂直線層使用（不畫任何東西）
        ({ xScale, yScale, innerWidth, innerHeight }) => {
          scales.current = { x: xScale as (d: Date) => number, y: yScale as (v: number) => number, w: innerWidth, h: innerHeight };
          return null;
        }]}
    />
  );
});

// 【垂直線層】疊在圖表上方的透明 SVG（與投資組合頁走勢圖的十字線層相同）：
// 1. 感應區：依游標水平位置找最近的資料點（二分搜尋），每個畫面（requestAnimationFrame）最多更新一次；離開時清除。
// 2. 畫垂直線與該日的點，並在橫軸下方標出日期。參數：rows=資料點、hover／setHover=目前滑到第幾點、scales=底層圖表回報的座標換算
function DrawdownCross({ rows, hover, setHover, scales }: {
  rows: DrawRow[]; hover: number | null; setHover: (i: number | null) => void; scales: React.MutableRefObject<DrawScales | null>;
}) {
  const t = useTokens();
  const frame = useRef(0); // 等待中的畫面更新編號
  const latest = useRef<number | null>(null); // 最新的游標水平位置（繪圖區座標）
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const track = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    latest.current = e.clientX - box.left - TREND_MARGIN.left;
    if (frame.current) return; // 這個畫面已排好更新，只記下最新位置
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const s = scales.current;
      const px = latest.current;
      if (!s || px == null) return;
      let a = 0;
      let b = rows.length - 1;
      while (b - a > 1) { const m = (a + b) >> 1; if (s.x(rows[m].x) < px) a = m; else b = m; }
      setHover(Math.abs(s.x(rows[a].x) - px) <= Math.abs(s.x(rows[b].x) - px) ? a : b);
    });
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    latest.current = null;
    setHover(null);
  };

  const s = scales.current;
  let cross: React.ReactNode = null;
  if (hover != null && s && rows[hover]) {
    const r = rows[hover];
    const x = s.x(r.x);
    const dx = Math.min(Math.max(x - DATE_PILL_W / 2, -TREND_MARGIN.left + 4), s.w - DATE_PILL_W);
    cross = (
      <g pointerEvents="none">
        <line x1={x} x2={x} y1={0} y2={s.h} stroke={t.ink} strokeOpacity={0.5} strokeWidth={1} />
        <circle cx={x} cy={s.y(r.y)} r={4.5} fill={t.surface} stroke={t.loss} strokeWidth={2} />
        <g transform={`translate(${dx},${s.h + 6})`}>
          <rect width={DATE_PILL_W} height={PILL_H} rx={PILL_H / 2} fill={t.ink} />
          <text x={DATE_PILL_W / 2} y={PILL_H / 2} textAnchor="middle" dominantBaseline="central" fill={t.surface}
            fontSize={t.theme.text.fontSize} fontFamily={t.theme.text.fontFamily}>{r.date}</text>
        </g>
      </g>
    );
  }
  return (
    <svg className={pstyles.crossLayer}>
      <rect width="100%" height="100%" fill="transparent" className={pstyles.crossHit}
        onPointerMove={track} onPointerDown={track} onPointerLeave={leave} />
      <g transform={`translate(${TREND_MARGIN.left},${TREND_MARGIN.top})`}>{cross}</g>
    </svg>
  );
}

// ─────────────────────────── 2. 風險貢獻度 ───────────────────────────

// 【權重與風險貢獻對照】水平分組長條：每檔兩條（權重、風險貢獻比例），共用同一條百分比軸；依風險貢獻比例由大到小，
// 圖例放在標題列右側。預設只顯示前 5 檔，下方置中的按鈕展開其餘（與庫存明細的展開按鈕相同）。風險貢獻可為負（抵銷效果），軸一定跨過 0。
// 滑過或點按長條會微微放大並顯示提示框。參數：positions=持股（已依 pcr 排序）、head=圖表標題（含說明圖示）
export const WeightPcrChart = memo(function WeightPcrChart({ positions, head }: { positions: AnalysisPosition[]; head: React.ReactNode }) {
  const t = useTokens();
  const narrow = useMaxTicks() < 8; // 手機（≤734px）：名稱欄縮窄、名稱只留前 3 個字，長條圖才有足夠寬度
  const [all, setAll] = useState(false);
  const rows = all ? positions : positions.slice(0, TOP_ROWS);
  const hiddenNegative = !all && positions.slice(TOP_ROWS).some((p) => (p.pcr ?? 0) < 0);
  // Nivo 水平長條由下往上排，所以反轉順序讓風險貢獻最大的在最上面
  const data = [...rows].reverse().map((p) => ({ id: p.symbol, name: p.name, weight: p.weight, pcr: p.pcr ?? 0, hasPcr: p.pcr != null }));
  const values = rows.flatMap((p) => [p.weight, p.pcr ?? 0]);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const pad = (max - min || 1) * 0.18; // 右側（或左側）留空間給長條末端的百分比標籤
  const labelOf = (id: string) => {
    const p = positions.find((x) => x.symbol === id);
    const max = narrow ? 3 : 5; // 名稱最多顯示幾個字，超過以「…」結尾
    return p ? `${p.symbol} ${p.name.length > max ? p.name.slice(0, max) + "…" : p.name}` : id;
  };

  return (
    <div className={styles.column}>
      {/* 標題列：標題在左、圖例靠右（空間不夠時圖例換到下一行） */}
      <div className={styles.headRow}>
        {head}
        <div className={styles.legend}>
          <span><i style={{ background: t.weight }} />資金權重</span>
          <span><i style={{ background: t.pcr }} />風險貢獻比例</span>
        </div>
      </div>
      <div className={`${styles.barBox} ${styles.grow}`} style={{ height: rows.length * BAR_ROW + 48 }} role="img"
        aria-label="各持股的權重與風險貢獻比例對照">
        <ResponsiveBar
          data={data}
          keys={["weight", "pcr"]}
          indexBy="id"
          layout="horizontal"
          groupMode="grouped"
          margin={{ top: 8, right: 56, bottom: 32, left: narrow ? 104 : 140 }} // 左側放「代號 名稱」（14px 字桌機約 140px、手機縮短名稱後約 104px）；右側留給長條末端的百分比
          padding={0.3}
          innerPadding={GAP}
          valueScale={{ type: "linear", min: min < 0 ? min - pad : 0, max: max + pad }}
          colors={({ id }) => (id === "weight" ? t.weight : t.pcr)}
          borderRadius={4}
          borderWidth={0}
          borderColor={{ from: "color" }} // 外框與長條同色：滑過時加粗外框，看起來就是長條往四周放大
          enableLabel={false}
          enableGridX
          enableGridY={false}
          gridXValues={narrow ? 3 : 5}
          axisBottom={{ tickValues: narrow ? 3 : 5, format: (v: number) => `${Math.round(v * 100)}%` }} // 手機刻度少一點，文字才不會擠在一起
          axisLeft={{ format: labelOf }}
          theme={{ ...t.theme, text: { ...t.theme.text, fontSize: BAR_FONT } }}
          animate={false}
          tooltip={({ data: d }) => (
            <Tip>
              <div><b>{d.id}</b> {d.name}</div>
              <div>資金權重 <b>{pct(d.weight as number)}</b></div>
              <div>風險貢獻比例 <b>{d.hasPcr ? pct(d.pcr as number) : NA}</b></div>
              {d.hasPcr && <div>兩者差距 <b>{pct((d.pcr as number) - (d.weight as number), true)}</b></div>}
            </Tip>
          )}
          layers={[
            "grid",
            "axes",
            "bars",
            // 0% 線（有負值時才看得出來）與每條長條末端的百分比標籤
            ({ bars, xScale, innerHeight }) => {
              const zero = (xScale as (v: number) => number)(0);
              return (
                <g key="labels">
                  {min < 0 && <line x1={zero} x2={zero} y1={0} y2={innerHeight} stroke={t.outline} />}
                  {bars.map((b) => {
                    const v = b.data.value ?? 0;
                    const neg = v < 0;
                    return (
                      <text key={b.key} x={neg ? b.x - 4 - GROW : b.x + b.width + 4 + GROW} y={b.y + b.height / 2} dominantBaseline="central"
                        textAnchor={neg ? "end" : "start"} fill={t.ink} fontSize={BAR_FONT} fontFamily={t.theme.text.fontFamily}>
                        {b.data.id === "pcr" && !b.data.data.hasPcr ? NA : pct(v)}
                      </text>
                    );
                  })}
                </g>
              );
            },
          ]}
        />
      </div>
      {positions.length > TOP_ROWS && (
        <button type="button" className={styles.toggle} aria-expanded={all} onClick={(e) => toggleKeepingPlace(e.currentTarget, all, () => setAll((v) => !v))}>
          {all ? "收合" : `顯示其餘 ${positions.length - TOP_ROWS} 檔`}
          <Icon name="expand_more" size={20} className={all ? styles.flip : undefined} />
        </button>
      )}
      {hiddenNegative && (
        <div className={styles.infoBox}><Icon name="info" size={20} /><p>另有具抵銷效果的持股，請展開查看。</p></div>
      )}
      <div className={styles.srOnly}><table>
        <caption>各持股的權重與風險貢獻比例</caption>
        <thead><tr><th>代號</th><th>名稱</th><th>權重</th><th>風險貢獻比例</th></tr></thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.symbol}><td>{p.symbol}</td><td>{p.name}</td><td>{pct(p.weight)}</td><td>{pct(p.pcr)}</td></tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
});

// ─────────────────────────── 3. 相關係數（熱圖） ───────────────────────────

type HeatDatum = { x: string; y: number | null; diagonal: boolean };

// 【相關係數熱圖】兩兩持股的相關係數：軸標籤為代號，格內標數值（小數 2 位），格子一律撐滿寬度（超過 20 檔才固定格寬）。格子是圓角扁長方形（每列 34px，手機格子窄時列高跟著縮小），整張圖比正方形格子緊湊；
// 色階固定 −1（琥珀）～ 0（中性灰）～ +1（藍），不隨資料縮放。對角線（自己與自己）為透明底、標「—」，缺值標「N/A」。
// 不超過 20 檔時格子撐滿寬度，超過時固定格寬並可左右捲動。滑過或點按格子會微微放大並顯示提示框。
// 參數：symbols=代號（矩陣順序）、names=代號對名稱、matrix=相關係數矩陣
export const CorrelationHeatmap = memo(function CorrelationHeatmap({ symbols, names, matrix }: { symbols: string[]; names: Record<string, string>; matrix: (number | null)[][] }) {
  const t = useTokens();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = symbols.length;
  const fit = n <= HEAT_MAX_FIT;
  const sideMargin = { right: GROW, bottom: GROW, left: 56 }; // 右、下各留放大的空間，邊緣的格子放大時不被切掉
  const step = fit ? Math.max(8, (width - sideMargin.left - sideMargin.right) / n) : HEAT_FIXED_CELL; // 每格寬（含間距），一律撐滿寬度
  const cellW = step - GAP; // 格子本身的寬度
  const row = Math.min(HEAT_ROW, Math.max(HEAT_MIN_ROW, step)); // 列高：寬度夠時固定 34px，窄時與格寬相近
  const rotate = step < HEAT_ROTATE_BELOW;
  const margin = { ...sideMargin, top: rotate ? 52 : 28 }; // 直排時上方留較多空間給代號
  const size = { w: margin.left + margin.right + step * n, h: margin.top + margin.bottom + row * n };
  const showLabels = cellW >= HEAT_MIN_LABEL;
  const text = (v: number | null, diagonal: boolean) => (diagonal ? "—" : v == null ? NA : v.toFixed(2));

  // 發散色階：依係數在相鄰兩個色標之間線性內插
  const colorOf = (v: number) => {
    const stops = t.heat;
    for (let i = 1; i < stops.length; i++) {
      const [v1, c1] = stops[i];
      const [v0, c0] = stops[i - 1];
      if (v <= v1) return mix(c0, c1, (v - v0) / (v1 - v0));
    }
    return stops[stops.length - 1][1];
  };
  const data = symbols.map((row, i) => ({
    id: row,
    data: symbols.map((col, j) => ({ x: col, y: i === j ? 0 : matrix[i][j], diagonal: i === j })),
  }));

  return (
    <div>
      <div ref={boxRef} className={`${styles.heatBox} ${styles.grow} ${fit ? "" : styles.heatScroll}`} role="img"
        aria-label="持股之間的相關係數熱圖">
        {width > 0 && (
          <HeatMap<HeatDatum, Record<string, never>>
            data={data}
            width={size.w}
            height={size.h}
            margin={margin}
            xInnerPadding={GAP / step}
            yInnerPadding={GAP / row}
            borderRadius={4}
            borderWidth={0}
            borderColor={{ from: "color" }} // 外框與格子同色：滑過時加粗外框，看起來就是格子往四周放大
            axisTop={{ tickSize: 0, tickPadding: 8, tickRotation: rotate ? -90 : 0 }}
            axisLeft={{ tickSize: 0, tickPadding: 8 }}
            axisBottom={null}
            axisRight={null}
            colors={(c) => (c.data.diagonal ? t.diagonal : c.value == null ? t.missing : colorOf(c.value))}
            emptyColor={t.missing}
            enableLabels={showLabels}
            label={(c) => text(c.value, c.data.diagonal)}
            labelTextColor={(c) => (c.data.diagonal ? t.ink : contrast(c.color, t.ink) >= contrast(c.color, t.inkInverse) ? t.ink : t.inkInverse)}
            theme={{ ...t.theme, labels: { text: { fontSize: cellW < HEAT_SMALL_CELL ? 11 : 12, fontFamily: t.theme.text.fontFamily } } }}
            hoverTarget="cell"
            activeOpacity={1}
            inactiveOpacity={1} // 滑過時不讓其他格子變淡，只放大該格並顯示提示框
            animate={false}
            tooltip={({ cell: c }) => (
              <Tip>
                <div>{`${names[c.serieId] ?? ""}（${c.serieId}）`}</div>
                <div>{`${names[c.data.x] ?? ""}（${c.data.x}）`}</div>
                <div>相關係數 <b>{text(c.value, c.data.diagonal)}</b></div>
              </Tip>
            )}
          />
        )}
      </div>
      {/* 連續色條：與投資組合頁個股別熱力圖的色條相同，刻度只標在兩側（−1、+1） */}
      <div className={`${pstyles.heatLegend} ${styles.scale}`} aria-hidden="true">
        <span>−1</span>
        <span className={pstyles.heatBar} style={{ background: `linear-gradient(90deg, ${t.heat.map(([, c]) => c).join(", ")})` }} />
        <span>+1</span>
      </div>
      <div className={styles.srOnly}><table>
        <caption>持股之間的相關係數</caption>
        <thead><tr><th>代號</th>{symbols.map((s) => <th key={s}>{s}</th>)}</tr></thead>
        <tbody>
          {symbols.map((row, i) => (
            <tr key={row}><th>{row}</th>{symbols.map((col, j) => <td key={col}>{text(matrix[i][j], i === j)}</td>)}</tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
});

// 【回撤資料表】回撤走勢圖的替代內容（只列高點、最低點等重點，避免上千列）。參數：data=回撤資料
export function DrawdownTable({ data }: { data: DrawdownData }) {
  return (
    <div className={styles.srOnly}><table>
      <caption>回撤走勢重點</caption>
      <tbody>
        <tr><th>最大回撤</th><td>{pct(data.trough.drawdown)}</td></tr>
        <tr><th>發生日期</th><td>{data.trough.date}</td></tr>
        <tr><th>期間</th><td>{`${data.series[0].date} ～ ${data.series[data.series.length - 1].date}`}</td></tr>
      </tbody>
    </table></div>
  );
}
