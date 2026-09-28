import { Fragment, ReactNode } from "react";
import { decimal, money, NA, pct, pnlColor, signedMoney } from "../format";
import Icon from "./ui/Icon";
// 表格樣式沿用投資組合詳情頁（DESIGN.md Expandable table），兩處共用同一份外觀
import styles from "../pages/PortfolioDetail.module.css";

// 表格一列用到的持股欄位（後端 GET /portfolios/{id} 的 positions）
export type HoldingRow = {
  symbol: string; name: string; industry: string; market: string; quantity: string; averageCost: string; costAmount: string;
  latestPrice: string | null; marketValue: string | null; unrealizedPnl: string | null; unrealizedReturn: number | null;
  annualizedReturn: number | null; weight: number | null;
};

// 【年化報酬顯示】有值顯示百分比（不帶 %，表頭已有單位）；無法計算（持有未滿 30 日或缺報價）一律顯示「N/A」。參數：v=年化報酬率
function annualText(v: number | null): string {
  return v != null ? pct(v, true).replace(/%$/, "") : NA;
}

// 【庫存明細表】每檔一列：代號/名稱（市場別／產業別）、平均價格、持有數量、持有成本、最新價格、未實現損益（附報酬率）、年化報酬率、市值權重。
// 投資組合詳情頁可展開每檔的買進紀錄（給 isOpen／onToggle／renderDetail）；風險分析報告頁只顯示這些列、不能展開。
// 參數：positions=要顯示的持股、isOpen=某檔是否展開、onToggle=點列或箭頭時切換展開、renderDetail=展開後列下方的內容
export default function HoldingsTable<P extends HoldingRow>({ positions, isOpen, onToggle, renderDetail }: {
  positions: P[]; isOpen?: (p: P) => boolean; onToggle?: (p: P) => void; renderDetail?: (p: P) => ReactNode;
}) {
  const expandable = !!onToggle;
  const cols = expandable ? 9 : 8;
  return (
    <div className={styles.tableScroll}>
      <table className={expandable ? styles.table : `${styles.table} ${styles.noExpand}`}>
        <thead>
          <tr>
            <th className={styles.left}>代號/名稱<span className={styles.thUnit}>(市場別/產業別)</span></th>
            <th>平均價格<span className={styles.thUnit}>(元)</span></th>
            <th>持有數量<span className={styles.thUnit}>(股)</span></th>
            <th>持有成本<span className={styles.thUnit}>(元)</span></th>
            <th>最新價格<span className={styles.thUnit}>(元)</span></th>
            <th>未實現損益<span className={styles.thUnit}>(元)</span></th>
            <th>年化報酬率<span className={styles.thUnit}>(%)</span></th>
            <th>市值權重<span className={styles.thUnit}>(元)</span></th>
            {expandable && <th aria-label="展開明細" />}
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => {
            const open = isOpen?.(p) ?? false;
            return (
              <Fragment key={p.symbol}>
                {/* 每檔之間的間隔列（不用 border-spacing，才不會把展開的列與下方明細面板拆開） */}
                {i > 0 && <tr className={styles.gapRow} aria-hidden="true"><td colSpan={cols} /></tr>}
                <tr className={`${styles.row} ${open ? styles.rowOpen : ""}`} onClick={expandable ? () => onToggle!(p) : undefined}>
                  {/* 代號/名稱：代號＋名稱，下方小字為市場別與產業別 */}
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
                  <td style={{ color: pnlColor(p.annualizedReturn) }}>{annualText(p.annualizedReturn)}</td>
                  {/* 市值權重：上方為目前市值，下方橫條長度代表占組合的權重 */}
                  <td>
                    {money(p.marketValue)}
                    {p.weight != null && <div className={styles.weightBar} title={`權重 ${pct(p.weight)}`}><span style={{ width: `${Math.min(100, p.weight * 100)}%` }} /></div>}
                  </td>
                  {expandable && (
                    <td>
                      <button type="button" className={styles.expand} aria-expanded={open}
                        aria-label={`${open ? "收合" : "展開"} ${p.symbol} 的買進紀錄`}
                        onClick={(e) => { e.stopPropagation(); onToggle!(p); }}>
                        <Icon name="expand_more" size={22} />
                      </button>
                    </td>
                  )}
                </tr>
                {open && renderDetail && (
                  <tr className={styles.lotsRow}>
                    <td colSpan={cols}>{renderDetail(p)}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 【漲跌幅文字】表格內的報酬率：實心三角箭頭（▲漲、▼跌，較小）＋不帶正負號的數字＋小字 %；箭頭、數字與 % 的顏色都跟著外層的漲跌色。
// 無值時顯示「N/A」。參數：v=報酬率（比例）
export function ChangePct({ v }: { v: number | null }) {
  if (v == null) return <>{NA}</>;
  return (
    <>
      {v !== 0 && <span className={styles.changeArrow}>{v > 0 ? "▲" : "▼"}</span>}
      {pct(Math.abs(v)).replace("%", "")}
      <span className={`${styles.unit} ${styles.unitTone}`}>%</span>
    </>
  );
}
