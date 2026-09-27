import { createContext, memo, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { NodeComponent, ResponsiveTreeMap } from "@nivo/treemap";
import { compactMoney, money, pct, signedMoney } from "../format";
import Icon from "./ui/Icon";
import styles from "./PortfolioCharts.module.css";

// 持股部位（後端 GET /portfolios/{id} 的 positions 中，圖表用到的欄位）
export type ChartPosition = {
  symbol: string;
  name: string;
  industry: string;
  market: string;
  securityType: string;
  costAmount: string;
  marketValue: string | null;
  unrealizedPnl: string | null;
  unrealizedReturn: number | null;
  weight: number | null;
};
// 走勢的一個點：當天市值、累計投入成本、年化報酬率
export type HistoryPoint = { date: string; marketValue: string; costAmount: string; annualizedReturn: number | null };
// 一筆買進（標註在市值走勢圖上）

// 類別色（四張配置圖共用同一組、同一順序）：tokens.css 的圖表專用色 --color-chart-1～20，
// 取自系統色相（品牌藍、琥珀、青、玫瑰、天藍等）的深淺兩階，並排好順序讓相鄰兩色在一般視覺與色盲模擬下都容易分辨；
// 超過 20 類時第 20 類起合併為灰色「其他」
const SERIES_TOKENS = Array.from({ length: 20 }, (_, i) => `--color-chart-${i + 1}`);
const MUTE_TOKEN = "--color-neutral-400"; // 降低飽和度時混入的中性灰
const MUTE = 0.2; // 熱力圖兩端混入 20% 中性灰，顏色較柔和
const TOP_N = SERIES_TOKENS.length; // 環形圖／樹狀圖最多單獨顯示幾類（20 類），其餘合併為「其他」
const DAY_MS = 86400000; // 一天的毫秒數

// 【讀取設計 token】Nivo 需要實際色碼（要拿來計算深淺），所以從 tokens.css 讀出變數值，不在這裡寫死色碼。參數：name=CSS 變數名稱
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// 【圖表共用色與主題】一次讀好全部要用的 token。無參數。
function useChartTokens() {
  return useMemo(() => {
    const text = token("--color-on-surface-variant");
    return {
      series: SERIES_TOKENS.map(token),
      other: token("--color-neutral-400"), // 「其他」一律用中性灰
      up: token("--color-error"), // 漲／賺（台股慣例紅）
      // 熱力圖兩端：為了與其他圖表風格一致，例外不用紅綠，改用同一組藍黃（賺＝藍、賠＝黃，降低飽和度）
      heatUp: mix(token("--color-primary-400"), token(MUTE_TOKEN), MUTE),
      heatDown: mix(token("--color-tertiary-500"), token(MUTE_TOKEN), MUTE),
      centerNum: parseFloat(token("--text-headline-lg-size")), // 環形圖中間數字的字級（px）
      centerText: parseFloat(token("--text-body-md-size")), // 環形圖中間「共」「檔」的字級（px）
      down: token("--color-success"), // 跌／賠（台股慣例綠）
      flat: token("--color-neutral-200"), // 熱力圖中間的「持平」色
      line: token("--color-primary-500"), // 市值線
      cost: token("--color-neutral-500"), // 投入成本線
      surface: token("--color-surface"),
      rule: token("--color-outline-variant"), // 走勢圖上下限的淡色線
      ink: token("--color-on-surface"),
      theme: {
        text: { fontSize: 12, fill: text, fontFamily: token("--font-family") },
        axis: { ticks: { text: { fill: text }, line: { stroke: "transparent" } }, domain: { line: { stroke: "transparent" } } },
        grid: { line: { stroke: token("--color-outline-variant"), strokeWidth: 1 } },
      },
    };
  }, []);
}

// 【混色】把兩個 #rrggbb 依比例混合（熱力圖從「持平灰」漸變到紅／綠用）。參數：a=起點色、b=終點色、t=0～1
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

// 【漲跌色】台股慣例：正為紅、負為綠、零為中性。參數：v=數值、t=色票
function toneOf(v: number, t: ReturnType<typeof useChartTokens>): string | undefined {
  return v > 0 ? t.up : v < 0 ? t.down : undefined;
}

// 【日期字串轉日期】YYYY-MM-DD 轉成本地日期（避免時區差一天）。參數：s=日期字串
function toDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 【日期轉字串】本地日期轉 YYYY-MM-DD。參數：d=日期
function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 【圖表提示框】滑過圖表時顯示的小卡。參數：children=內容
function Tip({ children }: { children: React.ReactNode }) {
  return <div className={styles.tooltip}>{children}</div>;
}

// ─────────────────────────── 1. 總覽卡片的迷你趨勢圖 ───────────────────────────

// 迷你趨勢圖的一個點
export type SparkPoint = { date: string; value: number | null };

// 【迷你折線圖】總覽卡片的趨勢線（不畫座標軸、不互動），五張卡片同一種「折線＋淡色面積」風格：
// 1. 橫軸為「最新交易日往前 1 個月」；資料不足 1 個月時改為顯示全部。橫軸一律從「這張圖第一個有數值的日期」開始、撐滿整個寬度，
//    不為了和其他圖對齊而補值或推算，所以各張圖的起點可能不同（例如每日損益第一天沒有數值，就從第二天開始）。
// 2. 0 軸平常貼齊圖表最下緣；只有出現負值時才往上挪，留出 0 軸下方的負值區域（面積一律由折線填到 0 軸）。
// 3. 顏色由呼叫端決定（跟著卡片上數字的顏色）：direction > 0 紅、< 0 綠、= 0 或未給為中性灰（台股慣例）；
//    blue＝不分漲跌的金額（目前總市值、總投入成本）用主色藍。
// 參數：points=每日數值（由舊到新）、direction=決定顏色的數值（通常就是卡片上的數字；未給＝中性色）、blue=用主色藍、label=無障礙說明、tall=大尺寸（撐滿容器）
export function Sparkline({ points, direction, blue, label, tall }: { points: SparkPoint[]; direction?: number; blue?: boolean; label: string; tall?: boolean }) {
  const t = useChartTokens();
  const box = tall ? styles.sparkTall : styles.spark;
  if (points.length === 0) return <div className={box} aria-hidden="true" />;
  // 1. 時間範圍：最近 1 個月內「有數值」的點；橫軸從第一個有數值的點開始（不足 1 個月時等於顯示全部）
  const end = toDate(points[points.length - 1].date);
  const monthAgo = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
  const pts = points
    .filter((p) => p.value != null && toDate(p.date) >= monthAgo)
    .map((p) => ({ x: toDate(p.date), y: p.value as number }));
  if (pts.length < 2) return <div className={box} aria-hidden="true" />;
  const start = pts[0].x;
  // 2. 縱軸：沒有負值時下限就是 0（0 軸在最下緣）；有負值時下限往下多留 10% 空間。上緣一律留 10%
  const lo = Math.min(0, ...pts.map((p) => p.y));
  const hi = Math.max(0, ...pts.map((p) => p.y));
  const pad = (hi - lo || 1) * 0.1;
  const yMin = lo < 0 ? lo - pad : 0;
  // 3. 顏色
  const color = blue ? t.line : direction == null || direction === 0 ? t.cost : direction > 0 ? t.up : t.down;
  return (
    <div className={box} role="img" aria-label={label}>
      <ResponsiveLine
        data={[{ id: "v", data: pts }]}
        margin={{ top: 4, right: 2, bottom: 4, left: 2 }}
        xScale={{ type: "time", precision: "day", min: start, max: end }}
        yScale={{ type: "linear", min: yMin, max: hi + pad }}
        curve="monotoneX"
        colors={[color]}
        lineWidth={2}
        enablePoints={false}
        enableGridX={false}
        enableGridY={false}
        axisBottom={null}
        axisLeft={null}
        isInteractive={false}
        animate={false}
        layers={[
          ({ series, lineGenerator, yScale, innerWidth }) => {
            const p = series[0].data.map((d) => d.position);
            const zero = (yScale as (v: number) => number)(0);
            return (
              <g key="a">
                <line x1={0} x2={innerWidth} y1={zero} y2={zero} stroke={t.cost} strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3" />
                <path d={`${lineGenerator(p)}L${p[p.length - 1].x},${zero}L${p[0].x},${zero}Z`} fill={color} fillOpacity={0.12} />
              </g>
            );
          },
          "lines",
        ]}
      />
    </div>
  );
}

// ─────────────────────────── 3. 資產與產業配置 ───────────────────────────

// 【圖表標題列】左邊粗體標題；右邊貼齊右側放說明文字（如「依目前市值」），兩者垂直置中。
// 參數：title=標題、note=說明文字
function Caption({ title, note }: { title: string; note: string }) {
  return (
    <figcaption className={styles.caption}>
      <span>{title}</span>
      <span className={styles.captionNote}>{note}</span>
    </figcaption>
  );
}

type Group = { id: string; value: number; color: string; count: number };

// 【占比依據】全部持股都有報價時用市值；任何一檔缺報價時改用投入成本。參數：positions=持股部位
function sizeOf(positions: ChartPosition[]): { byValue: boolean; size: (p: ChartPosition) => number } {
  const byValue = positions.length > 0 && positions.every((p) => p.marketValue != null);
  return { byValue, size: (p) => Number(byValue ? p.marketValue : p.costAmount) };
}

// 【依類別分組】把持股依某個欄位加總占比、由大到小排序並配色；超過 20 類時第 20 類起合併為「其他」。
// 參數：positions=持股部位、keyOf=取出分類的函式、t=色票
function groupBy(positions: ChartPosition[], keyOf: (p: ChartPosition) => string, t: ReturnType<typeof useChartTokens>): Group[] {
  const { size } = sizeOf(positions);
  const total = positions.reduce((s, p) => s + size(p), 0) || 1;
  const m = new Map<string, { value: number; count: number }>();
  positions.forEach((p) => {
    const g = m.get(keyOf(p)) ?? { value: 0, count: 0 };
    m.set(keyOf(p), { value: g.value + size(p) / total, count: g.count + 1 });
  });
  const sorted = [...m].map(([id, g]) => ({ id, ...g })).sort((a, b) => b.value - a.value);
  const head = sorted.length > TOP_N ? sorted.slice(0, TOP_N - 1) : sorted;
  const out = head.map((g, i) => ({ ...g, color: t.series[i] }));
  const rest = sorted.slice(head.length);
  if (rest.length) out.push({ id: `其他 ${rest.length} 類`, value: rest.reduce((s, g) => s + g.value, 0), count: rest.reduce((s, g) => s + g.count, 0), color: t.other });
  return out;
}

// 【分佈環形圖】市場別、證券別共用。中間單行顯示「共 N 檔」（預設為全部持股檔數；滑過或點選某塊時換成該類別的檔數），
// 滑過／點選時該塊微微放大並顯示提示框；右側圖例同時是螢幕閱讀器可讀的數字表。
// 參數：title=標題、positions=持股部位、keyOf=取出分類的函式（如市場別、有價證券別）
export function ShareDonut({ title, positions, keyOf }: { title: string; positions: ChartPosition[]; keyOf: (p: ChartPosition) => string }) {
  const t = useChartTokens();
  const { byValue } = sizeOf(positions);
  const groups = groupBy(positions, keyOf, t);
  const [active, setActive] = useState<string | null>(null);
  const focus = groups.find((g) => g.id === active);
  const count = focus ? focus.count : positions.length; // 中間顯示的檔數
  // 中間「共 N 檔」一行放進環形內圈：估算整行寬度，超過內圈可用寬度就等比例縮小（數字永遠比文字大）
  const inner = 106; // 內圈可放文字的寬度（px，內圈直徑約 126px 扣掉左右留白）
  const gap = t.centerText * 0.5; // 數字前後各留半個字寬的空白
  const width = t.centerText * 2 + String(count).length * t.centerNum * 0.62 + gap * 2;
  const fit = Math.min(1, inner / width);
  return (
    <figure className={styles.figure}>
      <Caption title={title} note={`依${byValue ? "目前市值" : "投入成本（部分持股缺報價）"}`} />
      <div className={styles.donutWrap}>
        <div className={styles.donut} role="img" aria-label={`${title}環形圖：${groups.map((g) => `${g.id} ${pct(g.value)}`).join("、")}`}>
          <ResponsivePie
            data={groups.map((g) => ({ id: g.id, value: g.value, color: g.color }))}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            innerRadius={0.7}
            padAngle={1.5}
            cornerRadius={6}
            activeOuterRadiusOffset={4}
            activeInnerRadiusOffset={0}
            activeId={active}
            onActiveIdChange={(id) => setActive(id == null ? null : String(id))}
            onClick={(d) => setActive(String(d.id))}
            colors={(d) => d.data.color}
            enableArcLinkLabels={false}
            enableArcLabels={false}
            tooltip={({ datum }) => <Tip><b>{datum.id}</b>　{pct(datum.value)}</Tip>}
            theme={t.theme}
            layers={["arcs", ({ centerX, centerY }) => (
              <g key="center" transform={`translate(${centerX},${centerY})`}>
                <text textAnchor="middle" dominantBaseline="central">
                  <tspan className={styles.centerUnit} style={{ fontSize: t.centerText * fit }}>共</tspan>
                  <tspan className={styles.centerValue} dx={gap * fit} style={{ fontSize: t.centerNum * fit }}>{count}</tspan>
                  <tspan className={styles.centerUnit} dx={gap * fit} style={{ fontSize: t.centerText * fit }}>檔</tspan>
                </text>
              </g>
            )]}
          />
        </div>
        <ul className={styles.legend}>
          {groups.map((g) => (
            <li key={g.id} className={active === g.id ? styles.legendActive : undefined}
              onMouseEnter={() => setActive(g.id)} onMouseLeave={() => setActive(null)} onClick={() => setActive(g.id)}>
              <span className={styles.dot} style={{ background: g.color }} />
              <span className={styles.legendLabel}>{g.id}<span className={styles.legendCount}>{g.count} 檔</span></span>
              <span className={styles.legendValue}>{pct(g.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

type TreeLeaf = { id: string; value: number; color: string; name: string; count?: string; valueText: string; tip: React.ReactNode };
const TREE_GROW = 3; // 滑過或點選時方塊往外放大的像素（與環形圖的放大幅度相近）
const TREE_GAP = 8; // 方塊之間的間距（px）：比放大幅度大，放大後與相鄰方塊仍保留 5px 空隙，像環形圖各塊之間的間隔

// 目前作用中（滑過／點選）的方塊，由外框提供給每個方塊讀取
const TreeActive = createContext<{ active: string | null; setActive: (id: string | null) => void }>({ active: null, setActive: () => {} });

// 【單一方塊】圓角矩形；作用中的方塊以 transform 從中心漸進放大（約 0.25 秒緩動，與環形圖的放大動畫相近），並沿用 Nivo 的提示框事件。
// 刻意定義在外框元件之外，讓 React 每次只更新同一個方塊、不會整個重建，動畫才接得上。參數：node=Nivo 算好的方塊位置與顏色
const TreeNode: NodeComponent<{ id: string; value: number }> = ({ node }) => {
  const { active, setActive } = useContext(TreeActive);
  const on = active === node.id;
  // 放大倍率：讓寬、高各往外長出 TREE_GROW 像素
  const sx = node.width > 0 ? (node.width + TREE_GROW * 2) / node.width : 1;
  const sy = node.height > 0 ? (node.height + TREE_GROW * 2) / node.height : 1;
  return (
    <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={8} ry={8} fill={node.color}
      style={{
        cursor: "pointer",
        transformBox: "fill-box",
        transformOrigin: "center",
        transform: on ? `scale(${sx}, ${sy})` : "scale(1)",
        transition: "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
      }}
      onMouseEnter={(e) => { setActive(node.id); node.onMouseEnter?.(e); }}
      onMouseMove={node.onMouseMove}
      onMouseLeave={(e) => { setActive(null); node.onMouseLeave?.(e); }}
      onClick={() => setActive(node.id)} />
  );
};

// 【方塊樹狀圖外框】產業別與個股別共用：左側方塊圖（面積代表占比，方塊內不放文字），右側清單列出名稱與數字（超出高度可捲動）。
// 滑過或點選方塊、清單任一列，對應方塊會微微放大並顯示提示框（與環形圖相同的互動），清單也會自動捲到對應的那一列；圖表撐滿卡片剩餘高度。
// 參數：title=標題、sub=副標、leaves=各方塊、ariaLabel=無障礙說明、legend=方塊圖下方的說明（可省略，寬度與方塊圖相同）
function TreeBox({ title, sub, leaves, ariaLabel, legend }: { title: string; sub: string; leaves: TreeLeaf[]; ariaLabel: string; legend?: React.ReactNode }) {
  const t = useChartTokens();
  const byId = new Map(leaves.map((l) => [l.id, l]));
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null); // 右側清單（可捲動的容器）

  // 【清單跟著捲動】方塊被放大時，若對應的清單列不在清單可見範圍內，就把清單平滑捲到讓那一列置中；
  // 只捲動清單本身、不動整個頁面，並尊重「減少動態效果」設定
  useEffect(() => {
    const list = listRef.current;
    if (!active || !list) return;
    const row = list.querySelector<HTMLLIElement>(`[data-id="${CSS.escape(active)}"]`);
    if (!row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top >= list.scrollTop && bottom <= list.scrollTop + list.clientHeight) return; // 已經看得到，不用捲
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ top: top - (list.clientHeight - row.offsetHeight) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  return (
    <figure className={`${styles.figure} ${styles.fill}`}>
      <Caption title={title} note={sub} />
      <TreeActive.Provider value={{ active, setActive }}>
      <div className={`${styles.treeWrap} ${legend ? "" : styles.treeWrapNoScale}`}>
        {/* 左欄：方塊圖＋（個股別才有的）漸層說明，說明條與方塊圖同寬 */}
        <div className={styles.treeCol}>
        <div className={styles.tree} role="img" aria-label={ariaLabel}>
          <ResponsiveTreeMap
            data={{ id: "root", children: leaves.map((l) => ({ id: l.id, value: Math.max(l.value, 0) })) }}
            identity="id"
            value="value"
            leavesOnly
            margin={{ top: TREE_GROW, right: TREE_GROW, bottom: TREE_GROW, left: TREE_GROW }}
            innerPadding={TREE_GAP}
            outerPadding={0}
            colors={(n) => byId.get(n.id)?.color ?? t.other}
            enableLabel={false}
            animate={false}
            nodeComponent={TreeNode}
            tooltip={({ node }) => <Tip>{byId.get(node.id)?.tip}</Tip>}
            theme={t.theme}
          />
        </div>
        {legend}
        </div>
        <ul ref={listRef} className={`${styles.legend} ${styles.treeLegend}`}>
          {leaves.map((l) => (
            <li key={l.id} data-id={l.id} className={active === l.id ? styles.legendActive : undefined}
              onMouseEnter={() => setActive(l.id)} onMouseLeave={() => setActive(null)} onClick={() => setActive(l.id)}>
              <span className={styles.dot} style={{ background: l.color }} />
              <span className={styles.legendLabel}>{l.name}{l.count && <span className={styles.legendCount}>{l.count}</span>}</span>
              <span className={styles.legendValue}>{l.valueText}</span>
            </li>
          ))}
        </ul>
      </div>
      </TreeActive.Provider>
    </figure>
  );
}

// 【產業別樹狀圖】依官方產業別加總占比，面積越大代表資金越集中在該產業。參數：positions=持股部位
export function IndustryTreemap({ positions }: { positions: ChartPosition[] }) {
  const t = useChartTokens();
  const { byValue } = sizeOf(positions);
  const groups = groupBy(positions, (p) => p.industry, t);
  const leaves = groups.map((g) => ({
    id: g.id, value: g.value, color: g.color, name: g.id, valueText: pct(g.value),
    tip: <><b>{g.id}</b><br />占比 {pct(g.value)}・{g.count} 檔</>,
  }));
  return (
    <TreeBox title="產業別" sub={`依${byValue ? "目前市值" : "投入成本"}`} leaves={leaves}
      ariaLabel={`產業別樹狀圖：${groups.map((g) => `${g.id} ${pct(g.value)}`).join("、")}`} />
  );
}

// 【個股別熱力圖】每檔一塊：面積為目前市值（缺報價時用投入成本），顏色為未實現報酬率（賺為藍、賠為黃，越深代表幅度越大，接近 0 為灰；
// 為了與其他圖表的藍黃色系一致，這裡例外不用台股紅綠）。
// 參數：positions=持股部位
export function HoldingsHeatmap({ positions }: { positions: ChartPosition[] }) {
  const t = useChartTokens();
  const { byValue, size } = sizeOf(positions);
  // 色階滿格的報酬率：取持股中最大幅度，至少 10%，避免小漲小跌就被塗成深色
  const scale = Math.max(0.1, ...positions.map((p) => Math.abs(p.unrealizedReturn ?? 0)));
  const leaves = positions.map((p) => {
    const r = p.unrealizedReturn;
    const color = r == null ? t.other : mix(t.flat, r >= 0 ? t.heatUp : t.heatDown, Math.min(1, Math.abs(r) / scale));
    return {
      id: p.symbol, value: size(p), color, name: `${p.symbol} ${p.name}`, valueText: pct(r, true),
      tip: <><b>{p.symbol} {p.name}</b><br />市值 {money(p.marketValue)} 元{p.weight != null && `（${pct(p.weight)}）`}<br /><span style={{ color: r == null ? undefined : toneOf(r, t) }}>損益 {signedMoney(p.unrealizedPnl)} 元（{pct(r, true)}）</span></>,
    };
  });
  return (
    <TreeBox title="個股別" sub={`面積：${byValue ? "市值" : "投入成本"}｜顏色：報酬率`} leaves={leaves}
      ariaLabel={`個股別熱力圖：${positions.map((p) => `${p.symbol} ${pct(p.unrealizedReturn, true)}`).join("、")}`}
      legend={
        <div className={styles.heatLegend} aria-hidden="true">
          <span>−</span>
          <span className={styles.heatBar} style={{ background: `linear-gradient(90deg, ${t.heatDown}, ${t.flat}, ${t.heatUp})` }} />
          <span>+</span>
        </div>
      } />
  );
}

// ─────────────────────────── 2. 歷史走勢 ───────────────────────────

// 走勢圖可選的區間（依資料長度動態顯示）；天數為 null 代表全部
const RANGES = [
  { key: "1M", label: "1 個月", days: 31 },
  { key: "3M", label: "3 個月", days: 92 },
  { key: "6M", label: "6 個月", days: 183 },
  { key: "1Y", label: "1 年", days: 366 },
  { key: "3Y", label: "3 年", days: 366 * 3 },
  { key: "5Y", label: "5 年", days: 366 * 5 },
  { key: "10Y", label: "10 年", days: 366 * 10 },
  { key: "ALL", label: "全部", days: null },
] as const;
const TREND_MARGIN = { top: 12, right: 12, bottom: 32, left: 64 }; // 兩張走勢圖同一組邊距，時間軸與十字線才會上下對齊
const TICK_STEPS = [1, 3, 12, 24, 60]; // 月刻度的間隔（月）：每月、每季、每年、每 2 年、每 5 年，挑第一個放得下的
const PILL_H = 20; // 十字線座標標籤的高度（px）
const DATE_PILL_W = 84; // 十字線日期標籤的寬度（px，放得下 YYYY-MM-DD）

type TrendKind = "value" | "pnl";
type TrendRow = { date: string; x: Date; value: number; cost: number; pnl: number; ret: number | null };
type TrendHover = { i: number; kind: TrendKind; y: number } | null; // i=滑到第幾天、kind=游標所在的圖、y=游標在該圖繪圖區內的高度（px）
type TrendScales = { x: (d: Date) => number; y: (v: number) => number; yInv: (px: number) => number; w: number; h: number };

// 【時間軸刻度】
// 1. 一個月以內：平均挑 5 個交易日（M/D）。
// 2. 超過一個月：標在月份的 1 號，間隔依序試「每月 → 每季（1、4、7、10 月）→ 每年 → 每 2 年 → 每 5 年」，
//    挑第一個刻度數不超過 maxTicks 的（例如 3、6 個月每月一個、1 年每季一個、全部視長度為每季或每年）。
// 參數：rows=區間內的每日資料、maxTicks=最多幾個刻度（依圖表寬度）
function trendTicks(rows: TrendRow[], maxTicks: number): { ticks: Date[]; step: number } {
  const first = rows[0].x;
  const last = rows[rows.length - 1].x;
  if ((last.getTime() - first.getTime()) / DAY_MS <= 31) {
    const n = Math.min(5, rows.length);
    return { ticks: Array.from({ length: n }, (_, k) => rows[Math.round((k * (rows.length - 1)) / Math.max(1, n - 1))].x), step: 0 };
  }
  for (const step of TICK_STEPS) {
    const ticks: Date[] = [];
    for (let d = new Date(first.getFullYear(), first.getMonth() + 1, 1); d <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      if ((d.getFullYear() * 12 + d.getMonth()) % step === 0) ticks.push(d);
    }
    if (ticks.length <= maxTicks || step === TICK_STEPS[TICK_STEPS.length - 1]) return { ticks, step };
  }
  return { ticks: [], step: 1 };
}

// 【刻度文字】「M/D」；區間跨年時第一個刻度加上年份（YYYY/M/D）；每年以上的刻度每個都寫年份（YYYY/1/1）。
// 參數：d=日期、i=第幾個刻度、step=月刻度間隔（0＝一個月以內）、crossYear=區間是否跨年
function tickText(d: Date, i: number, step: number, crossYear: boolean): string {
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  return step >= 12 || (crossYear && i === 0) ? `${d.getFullYear()}/${md}` : md;
}

// 【圖表寬度對應的刻度上限】手機（≤734px）最多 4 個，桌機最多 8 個，避免日期文字擠在一起。無參數。
function useMaxTicks(): number {
  const q = "(max-width: 734px)";
  const [narrow, setNarrow] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setNarrow(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return narrow ? 4 : 8;
}

// 【歷史走勢】最上方是撐滿寬度的區間切換（1 個月～全部），同時控制兩張圖：市值變化（市值＋累計投入成本）與損益變化（賺紅賠綠）。
// 滑鼠移到圖上（手機為點按或按住拖曳）會出現像看盤軟體的十字線：垂直線對準最近的交易日、兩張圖同步；水平線跟著游標高度，
// 左側與下方標出游標位置的金額與日期；每張圖標題旁顯示區間日期，最右側的讀數顯示該日數值（沒有滑過時顯示區間最後一天）。
// 效能：圖表本身只在資料或區間改變時才重畫；十字線畫在上方另一層、每個畫面更新一次，滑動時不會重算整張圖。
// 參數：points=每日走勢點（由舊到新，至少 2 點）
export function HistoryTrend({ points }: { points: HistoryPoint[] }) {
  const t = useChartTokens();
  const maxTicks = useMaxTicks();
  const spanDays = (toDate(points[points.length - 1].date).getTime() - toDate(points[0].date).getTime()) / DAY_MS;
  // 只提供比資料長度短的區間（加上「全部」），按了才看得到差別
  const ranges = RANGES.filter((r) => r.days == null || r.days < spanDays);
  const [range, setRange] = useState<string>("ALL");
  const cur = ranges.find((r) => r.key === range) ?? ranges[ranges.length - 1];
  const [hover, setHover] = useState<TrendHover>(null);
  // 視窗大小改變時圖表會重新排版，清掉十字線，避免留在舊的位置
  useEffect(() => {
    const clear = () => setHover(null);
    window.addEventListener("resize", clear);
    return () => window.removeEventListener("resize", clear);
  }, []);

  // 1. 依區間截取，並算好每天的損益與報酬率；刻度只在區間或寬度改變時重算
  const rows: TrendRow[] = useMemo(() => {
    const end = toDate(points[points.length - 1].date);
    const start = cur.days == null ? null : new Date(end.getTime() - cur.days * DAY_MS);
    return points
      .filter((p) => !start || toDate(p.date) >= start)
      .map((p) => {
        const value = Number(p.marketValue);
        const cost = Number(p.costAmount);
        return { date: p.date, x: toDate(p.date), value, cost, pnl: value - cost, ret: cost > 0 ? (value - cost) / cost : null };
      });
  }, [points, cur.days]);
  const axis = useMemo(() => {
    const { ticks, step } = trendTicks(rows, maxTicks);
    const crossYear = rows[0].x.getFullYear() !== rows[rows.length - 1].x.getFullYear();
    return { ticks, format: (v: Date | number | string) => tickText(v as Date, ticks.findIndex((d) => d.getTime() === (v as Date).getTime()), step, crossYear) };
  }, [rows, maxTicks]);
  const shown = rows[hover?.i ?? rows.length - 1]; // 讀數顯示的那一天
  const first = rows[0];
  const last = rows[rows.length - 1];
  // 標題右側的區間日期（兩張圖相同）
  const period = <span className={styles.trendPeriod}><Icon name="schedule" size={16} />{first.date} ~ {last.date}</span>;

  return (
    <div className={styles.trend}>
      {/* 區間切換：撐滿整個寬度，各選項等寬 */}
      <RangeTabs ranges={ranges} value={cur.key} onChange={(k) => { setRange(k); setHover(null); }} />

      {/* 2. 市值變化：標題＋區間日期在左、讀數在右 */}
      <figure className={styles.figure}>
        <figcaption className={styles.trendCaption}>
          <span className={styles.trendTitle}>市值變化{period}</span>
          <span className={styles.readout}>
            <span className={styles.readItem}><i className={styles.keyLine} style={{ background: t.line }} />市值<b>{money(String(shown.value))}</b>元</span>
            <span className={styles.readItem}><i className={styles.keyDash} style={{ borderColor: t.cost }} />累計投入成本<b>{money(String(shown.cost))}</b>元</span>
          </span>
        </figcaption>
        <TrendChart kind="value" rows={rows} axis={axis} hover={hover} setHover={setHover}
          label={`市值從 ${first.date} 的 ${money(String(first.value))} 元變為 ${last.date} 的 ${money(String(last.value))} 元`} />
      </figure>

      {/* 3. 損益變化：標題＋區間日期在左、讀數在右 */}
      <figure className={styles.figure}>
        <figcaption className={styles.trendCaption}>
          <span className={styles.trendTitle}>損益變化{period}</span>
          <span className={styles.readout}>
            <span className={styles.readItem} style={{ color: toneOf(shown.pnl, t) }}>
              損益<b>{signedMoney(String(shown.pnl))}</b>元
              {shown.ret != null && <span className={styles.readPct}>（ <b>{pct(shown.ret, true).replace("%", "")}</b> % ）</span>}
            </span>
          </span>
        </figcaption>
        <TrendChart kind="pnl" rows={rows} axis={axis} hover={hover} setHover={setHover}
          label={`損益從 ${first.date} 的 ${signedMoney(String(first.pnl))} 元變為 ${last.date} 的 ${signedMoney(String(last.pnl))} 元`} />
      </figure>
    </div>
  );
}

type TrendAxis = { ticks: Date[]; format: (v: Date | number | string) => string };

// 【區間切換】與頂端頁面導覽列相同的動畫：白色指示條以稍有回彈的曲線滑到選到的區間，按下瞬間指示條先放大一下再縮回。
// 參數：ranges=可選的區間、value=目前區間、onChange=切換時呼叫
function RangeTabs({ ranges, value, onChange }: {
  ranges: readonly { key: string; label: string }[]; value: string; onChange: (key: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>()); // 各選項按鈕，量測指示條位置用
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null); // 指示條的位置與寬度
  const [pressed, setPressed] = useState(false); // 剛按下的短暫「放大」瞬間
  const pressTimer = useRef<number | undefined>(undefined);

  // 1. 量測：選到的按鈕相對容器的位置；切換區間、選項數改變或視窗大小改變時重算
  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const btn = btnRefs.current.get(value);
      if (!wrap || !btn) return setBar(null);
      setBar({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, ranges.length]);
  useEffect(() => () => window.clearTimeout(pressTimer.current), []);

  // 2. 按下：指示條先放大（尊重「減少動態效果」設定），再滑到新位置
  const pick = (key: string) => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.clearTimeout(pressTimer.current);
      setPressed(true);
      pressTimer.current = window.setTimeout(() => setPressed(false), 180);
    }
    onChange(key);
  };

  return (
    <div ref={wrapRef} className={styles.segmented} role="radiogroup" aria-label="選擇走勢區間">
      {bar && (
        <span className={`${styles.segIndicator} ${pressed ? styles.segIndicatorPressed : ""}`} aria-hidden="true"
          style={{ translate: `${bar.left}px`, width: `${bar.width}px`, scale: pressed ? "1.08" : "1" }} />
      )}
      {ranges.map((r) => (
        <button key={r.key} type="button" role="radio" aria-checked={r.key === value}
          ref={(el) => { if (el) btnRefs.current.set(r.key, el); else btnRefs.current.delete(r.key); }}
          className={r.key === value ? styles.segActive : undefined} onClick={() => pick(r.key)}>
          {r.label}
        </button>
      ))}
    </div>
  );
}

// 【縱軸整數刻度】把資料範圍擴大到「整齊的刻度」（1、2、2.5、5 × 10 的次方），大約分 4 格，
// 上下限剛好落在刻度上，0 也一定是刻度之一。參數：lo=範圍下限（≤ 0）、hi=範圍上限（≥ 0）
function niceRange(lo: number, hi: number): { yMin: number; yMax: number; ticks: number[] } {
  const raw = (hi - lo || Math.abs(hi) || 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? 10 * mag;
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.max(Math.ceil(hi / step) * step, yMin + step);
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { yMin, yMax, ticks };
}

// 【單張走勢圖】底層是只在資料改變時才重畫的 Nivo 折線圖（TrendBase），上層是負責互動的十字線（TrendCross）。
// 參數：kind=哪一張圖、rows=區間資料、axis=時間軸刻度、hover／setHover=兩張圖共用的十字線狀態、label=無障礙說明
function TrendChart({ kind, rows, axis, hover, setHover, label }: {
  kind: TrendKind; rows: TrendRow[]; axis: TrendAxis; hover: TrendHover; setHover: (h: TrendHover) => void; label: string;
}) {
  const scales = useRef<TrendScales | null>(null); // 底層圖表畫好後回報的座標換算（不觸發重畫）
  return (
    <div className={`${styles.trendBox} ${kind === "value" ? styles.valueBox : styles.pnlBox}`} role="img" aria-label={label}>
      <TrendBase kind={kind} rows={rows} axis={axis} scales={scales} />
      <TrendCross kind={kind} rows={rows} hover={hover} setHover={setHover} scales={scales} />
    </div>
  );
}

// 【走勢圖本體】kind=value：市值實線＋淡色單色面積（不用漸層）、累計投入成本虛線；kind=pnl：損益線與面積，0 軸以上紅、以下綠。不畫格線。
// 用 memo 包起來：十字線移動時不會重畫這一層。參數：kind、rows、axis 同上；scales=回報座標換算用的容器
const TrendBase = memo(function TrendBase({ kind, rows, axis, scales }: {
  kind: TrendKind; rows: TrendRow[]; axis: TrendAxis; scales: React.MutableRefObject<TrendScales | null>;
}) {
  const t = useChartTokens();
  const uid = useId().replace(/:/g, ""); // 每張圖自己的 SVG id（裁切區不互相衝突）

  // 1. 縱軸範圍：兩張圖都一定包含 0（市值圖從 0 開始）；上下限取整數刻度，上下限線與 0 基準線都會落在刻度上
  const vals = kind === "value" ? rows.flatMap((r) => [r.value, r.cost]) : rows.map((r) => r.pnl);
  const { yMin, yMax, ticks: yTicks } = niceRange(Math.min(0, ...vals), Math.max(0, ...vals));

  const data = kind === "value"
    ? [{ id: "市值", data: rows.map((r) => ({ x: r.x, y: r.value })) }, { id: "成本", data: rows.map((r) => ({ x: r.x, y: r.cost })) }]
    : [{ id: "損益", data: rows.map((r) => ({ x: r.x, y: r.pnl })) }];

  return (
    <ResponsiveLine
      data={data}
      margin={TREND_MARGIN}
      xScale={{ type: "time", precision: "day", min: rows[0].x, max: rows[rows.length - 1].x }}
      yScale={{ type: "linear", min: yMin, max: yMax }}
      curve="monotoneX"
      enablePoints={false}
      isInteractive={false}
      enableGridX={false}
      enableGridY={false}
      axisLeft={{ tickValues: yTicks, format: (v) => compactMoney(Number(v)) }}
      axisBottom={{ tickValues: axis.ticks, format: axis.format }}
      theme={t.theme}
      layers={["axes",
        // 2. 上下限線（淡色）與 0 基準線（中性灰，比上下限明顯）
        ({ yScale, innerWidth, innerHeight }) => {
          const zero = (yScale as (v: number) => number)(0);
          return (
            <g key="rules">
              <line x1={0} x2={innerWidth} y1={0} y2={0} stroke={t.rule} strokeWidth={1} />
              <line x1={0} x2={innerWidth} y1={innerHeight} y2={innerHeight} stroke={t.rule} strokeWidth={1} />
              <line x1={0} x2={innerWidth} y1={zero} y2={zero} stroke={t.cost} strokeWidth={1} />
            </g>
          );
        },
        // 3. 線與面積
        ({ series, lineGenerator, yScale, innerWidth, innerHeight }) => {
          const p = series[0].data.map((d) => d.position);
          if (p.length < 2) return null;
          const line = lineGenerator(p) ?? "";
          if (kind === "value") {
            const cost = lineGenerator(series[1].data.map((d) => d.position)) ?? "";
            return (
              <g key="lines">
                <path d={`${line}L${p[p.length - 1].x},${innerHeight}L${p[0].x},${innerHeight}Z`} fill={t.line} fillOpacity={0.12} />
                <path d={cost} fill="none" stroke={t.cost} strokeWidth={1.5} strokeDasharray="6 4" />
                <path d={line} fill="none" stroke={t.line} strokeWidth={2} />
              </g>
            );
          }
          const zero = (yScale as (v: number) => number)(0);
          const area = `${line}L${p[p.length - 1].x},${zero}L${p[0].x},${zero}Z`;
          return (
            <g key="lines">
              <defs>
                <clipPath id={`${uid}-up`}><rect x={0} y={0} width={innerWidth} height={Math.max(0, zero)} /></clipPath>
                <clipPath id={`${uid}-down`}><rect x={0} y={zero} width={innerWidth} height={Math.max(0, innerHeight - zero)} /></clipPath>
              </defs>
              <path d={area} fill={t.up} fillOpacity={0.14} clipPath={`url(#${uid}-up)`} />
              <path d={area} fill={t.down} fillOpacity={0.14} clipPath={`url(#${uid}-down)`} />
              <path d={line} fill="none" stroke={t.up} strokeWidth={2} clipPath={`url(#${uid}-up)`} />
              <path d={line} fill="none" stroke={t.down} strokeWidth={2} clipPath={`url(#${uid}-down)`} />
            </g>
          );
        },
        // 4. 回報座標換算給十字線層使用（不畫任何東西）
        ({ xScale, yScale, innerWidth, innerHeight }) => {
          const ys = yScale as unknown as ((v: number) => number) & { invert: (px: number) => number };
          scales.current = { x: xScale as (d: Date) => number, y: ys, yInv: (px) => ys.invert(px), w: innerWidth, h: innerHeight };
          return null;
        }]}
    />
  );
});

// 【十字線層】疊在圖表上方的透明 SVG：
// 1. 感應區：依游標水平位置找最近的交易日（二分搜尋），每個畫面（requestAnimationFrame）最多更新一次，滑動才順；離開時清除。
// 2. 畫實線的垂直線（兩張圖同步）＋該日的點；游標所在的圖另畫實線的水平線，左側標出游標高度的金額、下方標出日期。
// 參數：kind、rows 同上；hover／setHover=共用十字線狀態；scales=底層圖表回報的座標換算
function TrendCross({ kind, rows, hover, setHover, scales }: {
  kind: TrendKind; rows: TrendRow[]; hover: TrendHover; setHover: (h: TrendHover) => void; scales: React.MutableRefObject<TrendScales | null>;
}) {
  const t = useChartTokens();
  const frame = useRef(0); // 等待中的畫面更新編號
  const latest = useRef<{ px: number; py: number } | null>(null); // 最新的游標位置（繪圖區座標）
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const track = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect(); // 感應區＝整個圖表框，扣掉邊距換成繪圖區座標
    latest.current = { px: e.clientX - box.left - TREND_MARGIN.left, py: e.clientY - box.top - TREND_MARGIN.top };
    if (frame.current) return; // 這個畫面已排好更新，只記下最新位置
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const s = scales.current;
      const pos = latest.current;
      if (!s || !pos) return;
      let a = 0;
      let b = rows.length - 1;
      while (b - a > 1) { const m = (a + b) >> 1; if (s.x(rows[m].x) < pos.px) a = m; else b = m; }
      const i = Math.abs(s.x(rows[a].x) - pos.px) <= Math.abs(s.x(rows[b].x) - pos.px) ? a : b;
      setHover({ i, kind, y: pos.py });
    });
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    latest.current = null;
    setHover(null);
  };

  const s = scales.current;
  const font = t.theme.text.fontFamily;
  let cross: React.ReactNode = null;
  if (hover && s && rows[hover.i]) {
    const r = rows[hover.i];
    const x = s.x(r.x);
    const own = hover.kind === kind;
    const y = Math.min(Math.max(hover.y, 0), s.h);
    const dx = Math.min(Math.max(x - DATE_PILL_W / 2, -TREND_MARGIN.left + 4), s.w - DATE_PILL_W);
    const yw = TREND_MARGIN.left - 8;
    const dots = kind === "value"
      ? [{ v: r.value, c: t.line }, { v: r.cost, c: t.cost }]
      : [{ v: r.pnl, c: r.pnl >= 0 ? t.up : t.down }];
    cross = (
      <g pointerEvents="none">
        <line x1={x} x2={x} y1={0} y2={s.h} stroke={t.ink} strokeOpacity={0.5} strokeWidth={1} />
        {own && <line x1={0} x2={s.w} y1={y} y2={y} stroke={t.ink} strokeOpacity={0.5} strokeWidth={1} />}
        {dots.map((d, k) => <circle key={k} cx={x} cy={s.y(d.v)} r={4.5} fill={t.surface} stroke={d.c} strokeWidth={2} />)}
        {own && (
          <g transform={`translate(${-TREND_MARGIN.left + 4},${y - PILL_H / 2})`}>
            <rect width={yw} height={PILL_H} rx={PILL_H / 2} fill={t.ink} />
            <text x={yw / 2} y={PILL_H / 2} textAnchor="middle" dominantBaseline="central" fill={t.surface} fontSize={11} fontFamily={font}>{compactMoney(s.yInv(y))}</text>
          </g>
        )}
        {own && (
          <g transform={`translate(${dx},${s.h + 6})`}>
            <rect width={DATE_PILL_W} height={PILL_H} rx={PILL_H / 2} fill={t.ink} />
            <text x={DATE_PILL_W / 2} y={PILL_H / 2} textAnchor="middle" dominantBaseline="central" fill={t.surface} fontSize={11} fontFamily={font}>{r.date}</text>
          </g>
        )}
      </g>
    );
  }

  return (
    <svg className={styles.crossLayer}>
      {/* 感應區蓋住整個圖表框（圖表尺寸量好之前也能接收游標） */}
      <rect width="100%" height="100%" fill="transparent" style={{ cursor: "crosshair", touchAction: "pan-y" }}
        onPointerMove={track} onPointerDown={track} onPointerLeave={leave} />
      <g transform={`translate(${TREND_MARGIN.left},${TREND_MARGIN.top})`}>{cross}</g>
    </svg>
  );
}
