import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { DISCLAIMER, money, pct, pnlColor, signedMoney } from "../format";

// 投資組合摘要（後端 GET /portfolios 每個項目）
type Summary = {
  id: number;
  name: string;
  symbolCount: number;
  costAmount: string;
  marketValue: string | null;
  unrealizedPnl: string | null;
  unrealizedReturn: number | null;
  latestPriceDate: string | null;
  lastAnalysisAt: string | null;
};
const MAX_PORTFOLIOS = 20; // 每位使用者最多的組合數（與後端一致）
const NAME_MAX = 30; // 組合名稱最長字數（與後端一致）

// 【首頁（投資組合管理）】登入後的主畫面：列出自己的全部投資組合（卡片），可新增組合、點進詳情頁。
// 從風險屬性結果頁按「新增投資組合」進來時，會直接展開新增表單。無參數。
export default function Home() {
  const { username, setUsername } = useAuth();
  const navigate = useNavigate();
  const openCreate = !!(useLocation().state as { openCreate?: boolean } | null)?.openCreate;
  const [items, setItems] = useState<Summary[] | null>(null); // null＝載入中
  const [error, setError] = useState(""); // 整頁載入失敗的說明
  const [creating, setCreating] = useState(openCreate); // 是否展開新增表單
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  // 【載入組合清單】向後端取得全部組合與損益摘要
  const load = useCallback(async () => {
    setError("");
    try {
      setItems((await api<{ items: Summary[] }>("/portfolios")).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "載入失敗，請稍後再試");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // 【新增組合】送出名稱；成功後直接進入該組合的詳情頁，讓使用者接著新增買進紀錄
  async function create(e: FormEvent) {
    e.preventDefault();
    // 1. 前端先擋：名稱 1～30 字（後端仍會再驗一次）
    const n = name.trim();
    if (n.length < 1 || n.length > NAME_MAX) return setFormError(`組合名稱須為 1～${NAME_MAX} 字`);
    // 2. 送出（期間按鈕停用，防止重複送出）
    setBusy(true);
    setFormError("");
    try {
      const p = await api<{ id: number }>("/portfolios", { name: n });
      navigate(`/portfolios/${p.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "新增失敗，請稍後再試");
      setBusy(false);
    }
  }

  // 【登出】通知後端讓通行證失效後回登入頁
  async function logout() {
    await api("/auth/logout", {}).catch(() => {});
    setUsername(null);
    navigate("/login", { replace: true });
  }

  const full = (items?.length ?? 0) >= MAX_PORTFOLIOS;
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 1080, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>我的投資組合</h1>
        <nav>
          歡迎，{username}　<Link to="/risk-profile">風險屬性</Link>　<Link to="/settings">使用者設定</Link>　<button onClick={logout}>登出</button>
        </nav>
      </header>
      <p style={{ color: "#666" }}>損益{DISCLAIMER}。</p>

      {/* 新增組合：按鈕展開的簡單表單，名稱 1～30 字、不可與既有組合同名 */}
      {creating ? (
        <form onSubmit={create} style={{ margin: "1rem 0" }}>
          <label>組合名稱　<input value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} autoFocus disabled={busy} /></label>{" "}
          <button disabled={busy || !name.trim()}>{busy ? "建立中…" : "建立"}</button>{" "}
          <button type="button" disabled={busy} onClick={() => { setCreating(false); setFormError(""); }}>取消</button>
          {formError && <div role="alert" style={{ color: "#b91c1c" }}>{formError}</div>}
        </form>
      ) : (
        <p>
          <button onClick={() => setCreating(true)} disabled={full || items === null}>新增投資組合</button>
          {full && <span style={{ marginLeft: 8, color: "#666" }}>已達 {MAX_PORTFOLIOS} 個組合上限</span>}
        </p>
      )}

      {/* 三種狀態：錯誤 → 載入中 → 空 / 有資料 */}
      {error ? (
        <div role="alert" style={{ border: "1px solid #b91c1c", padding: "1rem" }}>
          {error}　<button onClick={load}>重試</button>
        </div>
      ) : items === null ? (
        <p role="status">載入中…</p>
      ) : items.length === 0 ? (
        <div style={{ border: "1px dashed #999", padding: "2rem", textAlign: "center" }}>
          <p>還沒有投資組合。按上方「新增投資組合」建立一個，再輸入買進紀錄，就能看到損益與配置。</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {items.map((p) => (
            <Link key={p.id} to={`/portfolios/${p.id}`} style={{ border: "1px solid #ccc", padding: "1rem", textDecoration: "none", color: "inherit" }}>
              <h2 style={{ margin: "0 0 0.5rem" }}>{p.name}</h2>
              {p.symbolCount === 0 ? (
                <div style={{ color: "#666" }}>尚無買進紀錄</div>
              ) : (
                <>
                  <div>持股 {p.symbolCount} 檔</div>
                  <div>市值 {p.marketValue == null ? "— （部分持股缺最新報價）" : `${money(p.marketValue)} 元`}</div>
                  <div style={{ color: pnlColor(p.unrealizedPnl) }}>
                    未實現損益 {signedMoney(p.unrealizedPnl)} 元（{pct(p.unrealizedReturn, true)}）
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#666" }}>價格日期 {p.latestPriceDate ?? "—"}</div>
                </>
              )}
              <div style={{ fontSize: "0.85rem", color: "#666" }}>最近分析：{p.lastAnalysisAt ?? "尚未分析"}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
