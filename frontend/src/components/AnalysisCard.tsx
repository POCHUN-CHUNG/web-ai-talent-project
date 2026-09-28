import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { HistoryItem, metricParts, periodText, rateLabel } from "../analysis";
import { formatDateTime } from "../format";
import { ConfirmDialog } from "./PortfolioDialogs";
import Icon from "./ui/Icon";
import MoreMenu from "./ui/MoreMenu";
import styles from "./AnalysisCard.module.css";

// 六項摘要指標（順序與報告頁的風險指標相同）；mobile=false 的兩項在手機版隱藏，手機只顯示四項
const SUMMARY: { key: string; label: string; kind: "loss" | "percent" | "ratio"; mobile: boolean }[] = [
  { key: "max_drawdown", label: "最大回撤", kind: "loss", mobile: true },
  { key: "annualized_volatility", label: "年化波動度", kind: "percent", mobile: true },
  { key: "expected_shortfall_95", label: "95% 預期短缺", kind: "percent", mobile: false },
  { key: "beta", label: "Beta", kind: "ratio", mobile: true },
  { key: "sharpe_ratio", label: "夏普比率", kind: "ratio", mobile: true },
  { key: "sortino_ratio", label: "索丁諾比率", kind: "ratio", mobile: false },
];

// 【一筆歷史分析卡】整張卡是連到報告頁的連結：上方標題（組合名稱；在組合詳情頁內改為分析期間）與分析時間（靠右），
// 下一行為分析期間與報酬比較基準（組合詳情頁內只剩報酬比較基準；手機不顯示報酬比較基準），六項摘要指標（不顯示大盤對照；手機顯示四項），最下方為 AI 報告的主要風險特徵，報告還沒好時改顯示狀態。
// 分析時間右側有「⋯」選單（與投資組合總覽卡片相同），可刪除這份分析報告，刪除前一定先確認。
// 參數：item=一筆歷史分析、nested=放在另一張玻璃卡裡（改用細框、不再疊一層玻璃）、showPortfolio=是否顯示組合名稱、onDeleted=刪除後通知上層重新載入
export default function AnalysisCard({ item, nested, showPortfolio = true, onDeleted }: {
  item: HistoryItem; nested?: boolean; showPortfolio?: boolean; onDeleted: () => void;
}) {
  const period = periodText(item.period);
  const time = formatDateTime(item.created);
  const [confirming, setConfirming] = useState(false);
  return (
    // 卡片外包一層：「⋯」選單放在連結外面（按鈕不能放在連結裡），點選單不會進入報告
    <div className={`${styles.wrap} ${nested ? styles.wrapNested : styles.wrapGlass}`}>
    <MoreMenu className={styles.menu} label={`分析時間 ${time} 的更多操作`} items={[
      { label: "刪除", danger: true, onSelect: () => setConfirming(true) },
    ]} />
    {confirming && (
      <ConfirmDialog title="刪除分析報告" confirmLabel="刪除"
        message={`確定要刪除這份分析報告（分析時間：${time}）？此動作無法復原。`}
        onClose={() => setConfirming(false)}
        onConfirm={async () => { await api(`/analysis/${item.id}`, undefined, "DELETE"); setConfirming(false); onDeleted(); }} />
    )}
    <Link to={`/history/${item.id}`} className={`${styles.card} ${nested ? styles.nested : styles.glass}`}>
      <div className={styles.body}>
        <div className={styles.head}>
          {/* 組合詳情頁內以分析期間當標題：手機在冒號後換行，日期獨立一行 */}
          <span className={styles.name}>{showPortfolio ? item.portfolio.name : <>分析期間：<span className={styles.periodLine}>{period}</span></>}</span>
          <span className={styles.time}><Icon name="schedule" size={16} />分析時間：{time}</span>
        </div>
        {/* 分析期間與報酬比較基準：桌機同一行、以「｜」分隔；手機只顯示分析期間（不顯示報酬比較基準與分隔符號） */}
        <div className={styles.meta}>
          {showPortfolio && <><span>分析期間：{period}</span><span className={styles.sep}>｜</span></>}
          <span className={styles.rate}>報酬比較基準：{rateLabel(item.settings.rate_option, item.settings.risk_free_rate)}</span>
        </div>
        <div className={styles.metrics}>
          {SUMMARY.map((m) => {
            const v = item.metrics[m.key];
            return (
              <div key={m.key} className={m.mobile ? styles.metric : `${styles.metric} ${styles.desktopOnly}`}>
                <span className={styles.metricLabel}>{m.label}</span>
                <MetricValue v={v?.value} kind={m.kind} />
              </div>
            );
          })}
        </div>
        <ReportLine item={item} />
      </div>
    </Link>
    </div>
  );
}

// 【指標數值】數字用主色藍粗體，單位（%）縮小並用一般文字色。參數：v=值、kind=數值格式
function MetricValue({ v, kind }: { v: number | null | undefined; kind: "loss" | "percent" | "ratio" }) {
  const { num, unit } = metricParts(v, kind);
  return <span className={styles.metricValue}>{num}{unit && <span className={styles.unit}> {unit}</span>}</span>;
}

// 【報告狀態列】報告完成時列出主要風險特徵膠囊；產生中、失敗或尚未產生時顯示對應說明。參數：item=一筆歷史分析
function ReportLine({ item }: { item: HistoryItem }) {
  if (item.report_status === "ready" && item.report_features?.length) {
    return (
      <div className={styles.features}>
        {item.report_features.map((f) => <span key={f} className={styles.feature}>{f}</span>)}
      </div>
    );
  }
  const text =
    item.report_status === "pending" ? "分析解說產生中…"
    : item.report_status === "failed" ? "分析解說暫時無法產生，可進入報告重新產生"
    : "尚未產生分析解說，進入報告後自動產生";
  return (
    <div className={styles.status}>
      <Icon name={item.report_status === "failed" ? "warning" : "schedule"} size={16} />
      {text}
    </div>
  );
}
