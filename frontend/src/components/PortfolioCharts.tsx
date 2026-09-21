import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { money, pct, signedMoney } from "../format";

// 持股部位（後端 GET /portfolios/{id} 的 positions 中，圖表用到的欄位）
export type ChartPosition = {
  symbol: string;
  name: string;
  costAmount: string;
  marketValue: string | null;
  unrealizedPnl: string | null;
  weight: number | null;
};

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6", "#ec4899", "#84cc16", "#9ca3af"]; // 配置圖色票（最後一色給「其他」）
const UP = "#c0392b"; // 賺（台股慣例紅）
const DOWN = "#1e8449"; // 賠（台股慣例綠）
const TOP_N = 8; // 配置圖最多單獨顯示幾檔，其餘合併為「其他」
const THEME = { text: { fontSize: 12 }, tooltip: { container: { fontSize: 13 } } }; // Nivo 共用主題

// 【配置比例圖】Nivo 環形圖顯示各檔占比。全部有報價時依目前市值權重；任何一檔缺報價時改依投入成本（標題註明）。
// 圖下方附文字清單，同時是螢幕閱讀器可讀的資料表替代內容。參數：positions=持股部位
export function AllocationChart({ positions }: { positions: ChartPosition[] }) {
  // 1. 決定占比依據
  const byValue = positions.length > 0 && positions.every((p) => p.weight != null);
  const total = positions.reduce((s, p) => s + Number(p.costAmount), 0);
  const raw = positions
    .map((p) => ({ id: p.symbol, label: `${p.symbol} ${p.name}`, value: byValue ? (p.weight as number) : total > 0 ? Number(p.costAmount) / total : 0 }))
    .sort((a, b) => b.value - a.value);
  // 2. 只單獨顯示前 8 檔，其餘合併成「其他」
  const data = raw.slice(0, TOP_N);
  const rest = raw.slice(TOP_N).reduce((s, x) => s + x.value, 0);
  if (rest > 0) data.push({ id: "其他", label: `其他 ${raw.length - TOP_N} 檔`, value: rest });
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontWeight: "bold" }}>配置比例（依{byValue ? "目前市值" : "投入成本，部分持股缺最新報價"}）</figcaption>
      <div style={{ height: 260 }} role="img" aria-label="配置比例環形圖，詳細數字見下方清單">
        <ResponsivePie
          data={data}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          innerRadius={0.6}
          padAngle={1}
          cornerRadius={2}
          colors={COLORS}
          enableArcLinkLabels={false}
          arcLabel={(d) => (d.value >= 0.05 ? pct(d.value) : "")}
          arcLabelsTextColor="#fff"
          valueFormat={(v) => pct(v)}
          tooltip={({ datum }) => <div style={{ background: "#fff", padding: "4px 8px", border: "1px solid #ccc" }}>{datum.data.label}：{pct(datum.value)}</div>}
          theme={THEME}
        />
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {data.map((d, i) => (
          <li key={d.id}>
            <span style={{ display: "inline-block", width: 10, height: 10, background: COLORS[i % COLORS.length], marginRight: 6 }} />
            {d.label}：{pct(d.value)}
          </li>
        ))}
      </ul>
    </figure>
  );
}

// 【損益長條圖】Nivo 橫向長條圖顯示每檔未實現損益：向右為賺（紅）、向左為賠（綠）；缺報價的檔不畫並在下方註明。參數：positions=持股部位
export function PnlChart({ positions }: { positions: ChartPosition[] }) {
  const priced = positions.filter((p) => p.unrealizedPnl != null);
  const missing = positions.filter((p) => p.unrealizedPnl == null);
  const data = priced.map((p) => ({ label: `${p.symbol} ${p.name}`, pnl: Number(p.unrealizedPnl) })).reverse(); // 橫向圖由下往上畫，反轉後最大市值在最上面
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontWeight: "bold" }}>各檔未實現損益（元，未納入手續費與交易稅）</figcaption>
      <div style={{ height: Math.max(180, priced.length * 36 + 50) }} role="img" aria-label={`各檔未實現損益：${priced.map((p) => `${p.symbol} ${signedMoney(p.unrealizedPnl)}`).join("、")}`}>
        <ResponsiveBar
          data={data}
          keys={["pnl"]}
          indexBy="label"
          layout="horizontal"
          margin={{ top: 10, right: 30, bottom: 30, left: 130 }}
          padding={0.3}
          colors={(d) => (Number(d.value) >= 0 ? UP : DOWN)}
          enableLabel={false}
          enableGridY={false}
          axisBottom={{ format: (v) => Number(v).toLocaleString("zh-TW"), tickValues: 4 }}
          valueFormat={(v) => signedMoney(String(v))}
          tooltip={({ indexValue, value }) => <div style={{ background: "#fff", padding: "4px 8px", border: "1px solid #ccc" }}>{indexValue}：{signedMoney(String(value))} 元</div>}
          theme={THEME}
        />
      </div>
      {missing.length > 0 && <div style={{ fontSize: "0.85rem", color: "#b45309" }}>缺最新報價、未列入：{missing.map((p) => p.symbol).join("、")}</div>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem", color: "#666" }}>
        {priced.map((p) => <li key={p.symbol}>{p.symbol} {p.name}：{signedMoney(p.unrealizedPnl)} 元（市值 {money(p.marketValue)}）</li>)}
      </ul>
    </figure>
  );
}
