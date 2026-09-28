import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { HistoryPage } from "../analysis";
import AnalysisCard from "../components/AnalysisCard";
import Card from "../components/ui/Card";
import Chip from "../components/ui/Chip";
import IconButton from "../components/ui/IconButton";
import PageSpinner from "../components/ui/PageSpinner";
import Select from "../components/ui/Select";
import styles from "./History.module.css";

const PAGE_SIZE = 10; // 每頁筆數
const PENDING_POLL_MS = 5000; // 清單中有報告產生中時，每 5 秒重取一次，完成後自動更新狀態
const ALL = "all"; // 「全部」選項的值（不篩選投資組合）

// 【歷史紀錄頁】自己全部（或指定投資組合）的風險分析，由新到舊一張一張卡片列出，點卡片進入報告頁。
// 右上角可選投資組合篩選；組合與頁碼寫在網址（?portfolio=、?page=），從組合詳情頁「查看全部」進來時會自動選好該組合。無參數。
export default function History() {
  const [params, setParams] = useSearchParams();
  const portfolio = params.get("portfolio") ?? ALL;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [portfolios, setPortfolios] = useState<{ id: number; name: string }[] | null>(null);
  const [data, setData] = useState<HistoryPage | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0); // 刪除一筆後加 1，重新載入清單

  // 【載入投資組合清單】篩選選單用
  useEffect(() => {
    api<{ items: { id: number; name: string }[] }>("/portfolios")
      .then((r) => setPortfolios(r.items))
      .catch(() => setPortfolios([]));
  }, []);

  // 【載入歷史清單】換組合或換頁就重查；有報告產生中時定時重取
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    const query = `/analysis/history?page=${page}&page_size=${PAGE_SIZE}${portfolio === ALL ? "" : `&portfolio_id=${portfolio}`}`;
    async function load() {
      try {
        const r = await api<HistoryPage>(query);
        if (stopped) return;
        // 刪掉這一頁的最後一筆：回到上一頁
        if (r.items.length === 0 && page > 1) return go(portfolio, page - 1);
        setData(r);
        setError("");
        if (r.items.some((i) => i.report_status === "pending")) timer = window.setTimeout(load, PENDING_POLL_MS);
      } catch (e) {
        if (stopped) return;
        // 網址帶的組合不存在或不是自己的：改回全部
        if (e instanceof ApiError && (e.status === 404 || e.status === 403) && portfolio !== ALL) setParams({}, { replace: true });
        else setError(e instanceof ApiError ? e.message : "無法載入歷史紀錄，請稍後再試");
      }
    }
    load();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [portfolio, page, setParams, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 【切換篩選／頁碼】寫回網址，重新整理或上一頁時維持同一個畫面。參數：next=新的組合（ALL＝全部）、nextPage=頁碼
  function go(next: string, nextPage = 1) {
    const p: Record<string, string> = {};
    if (next !== ALL) p.portfolio = next;
    if (nextPage > 1) p.page = String(nextPage);
    setParams(p);
  }

  const title = <h1 className={styles.title}>歷史紀錄</h1>;
  // 載入中：只顯示標題與轉圈圈（DESIGN.md〈Page loading〉）
  if (!error && (!data || !portfolios)) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>{title}</div>
        <PageSpinner />
      </main>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        {title}
        {/* 投資組合篩選：桌機在標題列右側，手機移到標題下方撐滿寬度 */}
        <div className={styles.filter}>
          <Select
            id="historyPortfolio"
            ariaLabel="篩選投資組合"
            value={portfolio}
            onChange={(v) => go(v)}
            placeholder="請選擇投資組合"
            options={[{ value: ALL, label: "全部" }, ...(portfolios ?? []).map((p) => ({ value: String(p.id), label: p.name }))]}
          />
        </div>
      </div>

      {error ? (
        <Card className={styles.stateCard}><Chip variant="error">{error}</Chip></Card>
      ) : data!.total === 0 ? (
        <div className={styles.empty}>
          尚無分析紀錄
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {data!.items.map((item) => <AnalysisCard key={item.id} item={item} onDeleted={() => setReloadKey((k) => k + 1)} />)}
          </div>
          {totalPages > 1 && (
            <nav className={styles.pager} aria-label="頁碼">
              <IconButton icon="chevron_left" label="上一頁" onClick={() => go(portfolio, page - 1)} disabled={page <= 1} />
              <span className={styles.pageText}>第 {page} / {totalPages} 頁</span>
              <IconButton icon="chevron_right" label="下一頁" onClick={() => go(portfolio, page + 1)} disabled={page >= totalPages} />
            </nav>
          )}
        </>
      )}
    </main>
  );
}
