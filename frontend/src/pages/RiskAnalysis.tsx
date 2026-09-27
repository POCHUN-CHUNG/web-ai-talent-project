import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import Icon from "../components/ui/Icon";
import styles from "./RiskAnalysis.module.css";

type PortfolioOption = { id: number; name: string; symbolCount: number };

// 【風險分析頁】上方可選擇要分析的投資組合（從組合詳情頁按「進行風險分析」進來時，網址帶 ?portfolio=編號，會自動選好）；
// 分析內容尚未實作。無參數。
export default function RiskAnalysis() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<PortfolioOption[] | null>(null); // null＝載入中
  const [error, setError] = useState("");
  const selected = params.get("portfolio") ?? "";

  // 【載入組合清單】給下拉選單使用；網址帶的編號不在清單中（已刪除或不是自己的）就清掉
  useEffect(() => {
    api<{ items: PortfolioOption[] }>("/portfolios")
      .then((r) => {
        setItems(r.items);
        if (selected && !r.items.some((p) => String(p.id) === selected)) setParams({}, { replace: true });
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "載入投資組合失敗"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 【切換組合】選單值寫回網址，重新整理或分享網址時仍維持同一個組合。參數：id=組合編號（空字串＝未選）
  function choose(id: string) {
    setParams(id ? { portfolio: id } : {}, { replace: true });
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>風險分析</h1>
      <div className={styles.picker}>
        <label htmlFor="analysisPortfolio" className={styles.pickerLabel}>投資組合</label>
        <div className={styles.selectWrap}>
          <select id="analysisPortfolio" className={styles.select} value={selected} onChange={(e) => choose(e.target.value)} disabled={!items}>
            <option value="">{items ? "請選擇投資組合" : "載入中…"}</option>
            {items?.map((p) => (
              <option key={p.id} value={p.id} disabled={p.symbolCount === 0}>
                {p.name}{p.symbolCount === 0 ? "（尚無持股）" : `（${p.symbolCount} 檔）`}
              </option>
            ))}
          </select>
          <Icon name="expand_more" size={20} className={styles.selectIcon} />
        </div>
        {error && <span className={styles.error}>{error}</span>}
      </div>
      <div className={styles.placeholder}>功能開發中，敬請期待。</div>
    </main>
  );
}
