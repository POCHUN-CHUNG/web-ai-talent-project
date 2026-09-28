import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { monthsBefore, NA } from "../format";
import AlertDialog from "../components/ui/AlertDialog";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Icon from "../components/ui/Icon";
import InfoPopover from "../components/ui/InfoPopover";
import Notice from "../components/ui/Notice";
import PageSpinner from "../components/ui/PageSpinner";
import Select from "../components/ui/Select";
import Slider from "../components/ui/Slider";
import styles from "./RiskAnalysis.module.css";

// 下拉選單用的投資組合（後端 GET /portfolios 的一筆）：symbols=持股代號與名稱
type PortfolioOption = { id: number; name: string; symbolCount: number; symbols: { symbol: string; name: string }[] };
// 大盤指數的代號（發行量加權股價報酬指數 IR0001），與後端 services/analysis.py 一致
const BENCHMARK_SYMBOL = "IR0001";

// 一個可調整欄位的預設值與選項原文
type ProfileChoice = { value: string; choices: string[] };
// 風險分析可調整的三項問卷參數（後端 GET /risk-profiles/latest/analysis-inputs，不需投資組合）
type ProfileChoices = { investmentHorizon: ProfileChoice; withdrawalNeed: ProfileChoice; lossTolerance: ProfileChoice };
// 一個報酬比較基準選項：key=送出用的值、label=顯示文字、rate=年利率（null＝目前沒有資料，前端停用）
type RateOption = { key: string; label: string; rate: number | null; asOf: string | null };
// 分析前確認頁的期間與利率選項（後端 GET /portfolios/{id}/analysis/options，需先選投資組合）
type AnalysisOptions = {
  period: { maxYears: number; minYears: number; startDate: string; endDate: string; limitedBySymbols: string[]; dates: string[] };
  rateOptions: RateOption[];
  defaults: { lookbackYears: number | null; rateOption: string };
};
// 本次採用的三項可調整問卷參數（Q7、Q8、Q13）
type ProfileInputs = { investmentHorizon: string; withdrawalNeed: string; lossTolerance: string };

// 【月數顯示文字】整年顯示「N 年」，含零頭月份顯示「N 年 M 個月」，未滿一年只顯示「M 個月」。
// 全部用整數月數運算（不對「年」做小數運算），避免除以 12 產生的浮點誤差。參數：totalMonths=總月數
function formatMonths(totalMonths: number): string {
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths - y * 12;
  if (m === 0) return `${y} 年`;
  if (y === 0) return `${m} 個月`;
  return `${y} 年 ${m} 個月`;
}

const HOLDINGS_GAP = 24; // 持股標籤之間的左右間距（px），須與 CSS .holdingsRow 的 gap 一致
const HOLDINGS_VISIBLE_ROWS = 4; // 持股清單一次最多看得到的列數，超過就在清單內捲動
const HOLDINGS_MIN_ROW_GAP = 8; // 桌機列距下限（px）：卡片太矮時不讓標籤擠在一起，改成捲動
const HOLDINGS_MOBILE_ROW_GAP = 16; // 手機（單欄）時的固定列距（px）

// 【單列最佳組合】0/1 背包：在不超過 capacity 的前提下，從 widths 裡選出「總寬度（含彼此間距）最大」的一組索引，
// 也就是這一列能塞進去、又塞得最滿的組合，不是單純依寬度大小貪心塞入。
// 換算技巧：把每項的「成本」算成 寬度＋間距，目標容量算成 capacity＋間距，
// 這樣 n 個項目、共 n-1 個間距的真實限制，就等價於一般的 0/1 背包（每項成本固定、目標固定）。
// 參數：widths=候選項目的寬度、capacity=這一列的可用寬度、gap=項目間距
function bestFitRow(widths: number[], capacity: number, gap: number): number[] {
  const target = Math.floor(capacity) + gap;
  if (target <= 0 || widths.length === 0) return [];
  const costs = widths.map((w) => Math.round(w) + gap);
  const n = costs.length;
  const dp = new Array(target + 1).fill(0); // dp[c] = 用掉容量 c 以內，能塞出的最大總成本
  const picked: Uint8Array[] = Array.from({ length: n }, () => new Uint8Array(target + 1));
  for (let i = 0; i < n; i++) {
    const cost = costs[i];
    if (cost > target) continue; // 這一項自己就放不進這一列
    for (let c = target; c >= cost; c--) {
      if (dp[c - cost] + cost > dp[c]) {
        dp[c] = dp[c - cost] + cost;
        picked[i][c] = 1;
      }
    }
  }
  let bestC = 0;
  for (let c = 1; c <= target; c++) if (dp[c] > dp[bestC]) bestC = c;
  const chosen: number[] = [];
  let c = bestC;
  for (let i = n - 1; i >= 0; i--) {
    if (picked[i][c]) {
      chosen.push(i);
      c -= costs[i];
    }
  }
  return chosen;
}

// 【列排列演算法】逐列呼叫 bestFitRow，從剩餘項目中選出最能填滿這一列的組合，選完就從候選清單移除、
// 繼續排下一列，直到排完為止；因此哪個項目排在哪一列、原本的順序都可能被打散，換來每列右側留白最少。
// 參數：items=待排列項目（含各自寬度）、capacity=每列可用寬度、gap=項目間距
function packRows<T extends { width: number }>(items: T[], capacity: number, gap: number): T[][] {
  const remaining = [...items];
  const rows: T[][] = [];
  while (remaining.length > 0) {
    let chosen = bestFitRow(remaining.map((it) => it.width), capacity, gap);
    if (chosen.length === 0) {
      // 保底：連最窄的一個都放不下時（容器極窄），仍強制放進去，避免無窮迴圈
      let minIdx = 0;
      for (let i = 1; i < remaining.length; i++) if (remaining[i].width < remaining[minIdx].width) minIdx = i;
      chosen = [minIdx];
    }
    rows.push(chosen.map((i) => remaining[i]));
    chosen
      .sort((a, b) => b - a) // 由後往前刪除，避免刪除時索引位移影響還沒刪的
      .forEach((i) => remaining.splice(i, 1));
  }
  return rows;
}

// 報酬基準選項的詳細解釋（後端 label 只是簡短名稱，這裡補上白話說明，僅供前端顯示用）
const RATE_DESCRIPTIONS: Record<string, string> = {
  zero: "本金不虧損",
  bank_average: "五大公股銀行的一年期定期存款機動利率",
};

// 【換算成實際有資料的起始日】往回推算出的日期不一定是交易日，改成範圍內第一個「大於等於」該日期的實際交易日
// （與後端 services/analysis.py 的 `[d for d in dates if d >= start]` 邏輯一致，確保前端顯示的起始日跟後端算出來的一樣）；
// 找不到（理論上不會發生，滑桿範圍已經受 maxYears 限制）就以最舊的交易日作為保底。
// 參數：dates=由舊到新排序的共同交易日、target=往回推算出的目標日期
function actualStart(dates: string[], target: string): string {
  return dates.find((d) => d >= target) ?? dates[0];
}

// 【持股顯示名稱】代號對照到目前所選組合的持股名稱，格式「名稱（代號）」（與錯誤訊息相同）；大盤指數固定顯示「加權股價報酬指數（IR0001）」
// （大盤資料最晚開始時，最大期間就是受它限制），查不到就顯示代號本身。參數：symbol=代號、current=目前所選投資組合
function holdingLabel(symbol: string, current: PortfolioOption | null): string {
  if (symbol === BENCHMARK_SYMBOL) return `加權股價報酬指數（${BENCHMARK_SYMBOL}）`;
  const found = current?.symbols.find((s) => s.symbol === symbol);
  return found ? `${found.name}（${found.symbol}）` : symbol;
}

// 【報酬基準選項文字】格式「利率（詳細解釋）」，例如「1.692 %（五大公股銀行的一年期定期存款機動利率）」。
// 參數：r=一個報酬基準選項
function rateOptionLabel(r: RateOption): string {
  const pct = r.rate === null ? NA : r.rate === 0 ? "0 %" : `${(r.rate * 100).toFixed(3)} %`;
  const desc = RATE_DESCRIPTIONS[r.key] ?? r.label;
  return `${pct}（${desc}）${r.rate === null ? "（目前無資料）" : ""}`;
}

// 【風險分析頁】分析前的確認頁：選擇投資組合、用滑桿選分析期間（2 年至資料可分析的最大年數，最右端為「最大期間」且為預設）、
// 選報酬比較基準（0% 或五大公股銀行平均定存利率），並可單次調整 Q7 投資期限、Q8 一年內提款可能性、Q13 可接受損失區間
//（預設為問卷作答，只存入這次分析的快照，不寫回問卷）。財務風險承受能力不在此頁調整或顯示。
// 風險屬性只依賴問卷資料，選投資組合前就會顯示；分析期間與報酬比較基準則要選好組合才查得到（依賴該組合的價格資料）。
// 從組合詳情頁按「進行分析」進來時，網址帶 ?portfolio=編號，會自動選好。無參數。
// 【是否為重新整理】用瀏覽器 Navigation Timing API 判斷這次載入是「重新整理」還是「導覽過來」（含分享網址開新分頁）。
// 無參數；判斷不出來時當作不是重新整理（維持原本從投資組合詳情頁帶入預選組合的行為）
function isPageReload(): boolean {
  try {
    return performance.getEntriesByType("navigation").some((e) => (e as PerformanceNavigationTiming).type === "reload");
  } catch {
    return false;
  }
}

export default function RiskAnalysis() {
  const [params, setParams] = useSearchParams();
  // 重新整理要重置成未選組合（不保留網址參數帶入的組合）；直接導覽或分享網址開啟時仍維持網址上的組合
  // （只忽略載入當下網址上的參數；清掉參數後就恢復正常，之後使用者自己選的組合照常生效）
  const [reloaded, setReloaded] = useState(isPageReload);
  const selected = reloaded ? "" : params.get("portfolio") ?? "";
  const [items, setItems] = useState<PortfolioOption[] | null>(null); // null＝載入中
  const [loadError, setLoadError] = useState("");
  const [choices, setChoices] = useState<ProfileChoices | null>(null); // 風險屬性可調整欄位；null＝載入中
  const [choicesError, setChoicesError] = useState("");
  const [options, setOptions] = useState<AnalysisOptions | null>(null); // 目前所選組合的分析期間與利率選項；null＝未選或載入中
  const [optionsError, setOptionsError] = useState<ApiError | null>(null); // 這個組合目前無法分析的原因
  const [yearIndex, setYearIndex] = useState(0); // 滑桿位置（索引，非月數本身，見下方 monthsArray／maxIndex）
  const [rateOption, setRateOption] = useState(""); // 本次採用的報酬比較基準
  const [profileInputs, setProfileInputs] = useState<ProfileInputs | null>(null); // 本次採用的 Q7／Q8／Q13
  const [confirmed, setConfirmed] = useState(false); // 通過檢查：顯示確認視窗
  const sliderWrapRef = useRef<HTMLDivElement>(null); // 滑桿外層，用來量測寬度、算浮動標籤的位置
  const badgeRef = useRef<HTMLSpanElement>(null); // 浮動標籤本身，用來量測寬度
  const [badgeLeft, setBadgeLeft] = useState(0); // 浮動標籤置中點的 px 座標（已夾在邊界內）

  // 重新整理時把網址上殘留的組合參數清掉，讓網址與畫面（未選組合）一致
  useEffect(() => {
    if (!reloaded) return;
    if (params.has("portfolio")) setParams({}, { replace: true });
    setReloaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 【載入組合清單】網址帶的編號不在清單中（已刪除或不是自己的）就清掉
  useEffect(() => {
    api<{ items: PortfolioOption[] }>("/portfolios")
      .then((r) => {
        setItems(r.items);
        if (selected && !r.items.some((p) => String(p.id) === selected && p.symbolCount > 0)) setParams({}, { replace: true });
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "載入投資組合失敗"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 【載入風險屬性可調整欄位】只依賴問卷資料，不需要選投資組合
  useEffect(() => {
    api<ProfileChoices>("/risk-profiles/latest/analysis-inputs")
      .then((c) => {
        setChoices(c);
        setProfileInputs({ investmentHorizon: c.investmentHorizon.value, withdrawalNeed: c.withdrawalNeed.value, lossTolerance: c.lossTolerance.value });
      })
      .catch((e) => setChoicesError(e instanceof ApiError ? e.message : "載入風險屬性失敗"));
  }, []);

  // 【載入分析期間與利率選項】每次換組合就重查；切換太快時只採用最後一次的結果
  useEffect(() => {
    setOptions(null);
    setOptionsError(null);
    if (!selected) return;
    let stale = false;
    api<AnalysisOptions>(`/portfolios/${selected}/analysis/options`)
      .then((o) => {
        if (stale) return;
        setOptions(o);
        setRateOption(o.defaults.rateOption);
      })
      .catch((e) => !stale && setOptionsError(e instanceof ApiError ? e : new ApiError(0, "無法查詢分析選項")));
    return () => {
      stale = true;
    };
  }, [selected]);

  const current = items?.find((p) => String(p.id) === selected) ?? null;

  // 滑桿的月數選項（minYears換算的月數～⌊maxYears×12⌋個月，每格 1 個月），最後再加一格代表「最大期間」（送出時 lookbackYears＝null）
  const monthsArray = useMemo(() => {
    if (!options) return [];
    const minMonths = Math.round(options.period.minYears * 12);
    const maxMonths = Math.floor(options.period.maxYears * 12);
    const count = Math.max(0, maxMonths - minMonths + 1);
    return Array.from({ length: count }, (_, i) => minMonths + i);
  }, [options]);
  const maxIndex = monthsArray.length; // 滑桿範圍 0～maxIndex，maxIndex＝「最大期間」
  const lookbackMonths = yearIndex >= maxIndex ? null : monthsArray[yearIndex]; // null＝採最大期間

  // 選好組合後，把滑桿位置重置到「最大期間」（預設）
  useEffect(() => {
    if (options) setYearIndex(maxIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const periodEnd = options?.period.endDate ?? null;
  const periodStart =
    !options ? null
    : lookbackMonths === null ? options.period.startDate
    : actualStart(options.period.dates, monthsBefore(options.period.endDate, lookbackMonths));

  // 分析期間／利率選項狀態：idle＝尚未選組合、loading＝查詢中、error＝這個組合目前無法分析、ready＝可以分析
  const optionsState: "idle" | "loading" | "error" | "ready" = !selected ? "idle" : optionsError ? "error" : !options ? "loading" : "ready";

  // 【切換組合】選單值寫回網址，重新整理或分享網址時仍維持同一個組合。參數：id=組合編號（空字串＝未選）
  function choose(id: string) {
    setParams(id ? { portfolio: id } : {}, { replace: true });
  }

  // 【開始分析】按鈕只在「選好組合且確定可以分析」時才出現，按下直接顯示確認視窗（不需要再檢查、也沒有錯誤提示）
  function start() {
    setConfirmed(true);
  }

  const empty = items !== null && !items.some((p) => p.symbolCount > 0); // 沒有任何可分析（有持股）的組合
  // 整頁載入中：組合清單或風險屬性欄位還沒回來（查詢失敗不算載入中，會顯示錯誤）
  const pageLoading = !loadError && (items === null || (!choicesError && (!choices || !profileInputs)));
  const chosenRate = options?.rateOptions.find((r) => r.key === rateOption);
  const ready = optionsState === "ready" && !!options;
  // 滑桿的最大格線月數（⌊maxYears×12⌋），選到「最大期間」時顯示的就是這個值
  const flooredMaxMonths = ready ? Math.floor(options!.period.maxYears * 12) : null;
  // 滑桿浮動標籤的顯示文字：還沒選組合／查詢中時顯示狀態說明（取代原本卡片內另外一行的提示文字），
  // 可以分析時最大期間附上實際約略月數，避免使用者只看到「最大期間」不知道實際涵蓋多久
  const sliderValueText =
    optionsState === "idle" ? "請先選擇投資組合"
    : optionsState === "loading" ? "查詢中…"
    : !ready ? NA
    : lookbackMonths === null ? `最大期間（約 ${formatMonths(flooredMaxMonths!)}）`
    : formatMonths(lookbackMonths);

  // 【浮動標籤定位】依圓鈕位置算出標籤的置中點，再依標籤自己的寬度夾在 [半個標籤寬, 容器寬－半個標籤寬] 之間，
  // 讓標籤最多貼齊左右邊界、不會超出卡片外（例如選到「最大期間」時，圓鈕在最右端，標籤原本會有一半跑到卡片外）；
  // 座標無條件捨去到整數 px，避免子像素定位讓左右留白視覺上不對稱
  useLayoutEffect(() => {
    const wrap = sliderWrapRef.current;
    const badge = badgeRef.current;
    if (!wrap || !badge) return;
    const wrapWidth = wrap.clientWidth;
    const half = badge.offsetWidth / 2;
    const ratio = ready && maxIndex > 0 ? yearIndex / maxIndex : 0;
    const thumbCenter = 17 + (wrapWidth - 34) * ratio; // 與 Slider 的 --slider-fill 公式一致（圓鈕半寬 17px）
    setBadgeLeft(Math.round(Math.min(Math.max(thumbCenter, half), wrapWidth - half)));
  }, [ready, yearIndex, maxIndex, sliderValueText, pageLoading]);

  // 以下兩個提早結束的畫面都放在所有 hook 之後，避免 hook 呼叫順序因畫面不同而改變
  if (loadError) return <p style={{ padding: "2rem", color: "var(--color-error)" }}>{loadError}</p>;
  // 載入中：只顯示頁面標題與畫面中間的轉圈圈（DESIGN.md〈Page loading〉）
  if (pageLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>風險分析</h1>
        </div>
        <PageSpinner />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>風險分析</h1>
        {/* 可以分析時才出現；手機版改放在報酬基準下方（見下方 startMobile），這裡只在桌機顯示 */}
        {!empty && ready && <Button onClick={start} className={styles.startDesktop}>開始分析</Button>}
      </div>

      {empty ? (
        <div className={styles.empty}>請先到「投資組合」頁建立投資組合並加入持股，再回來進行分析</div>
      ) : (
        <>
          <Notice className={styles.noticeGap}>所有調整僅適用於當次分析。</Notice>

          {/* 1. 風險屬性：只依賴問卷資料，不需要選投資組合 */}
          <Card className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.titleGroup}>
                <h2 className={styles.sectionTitle}>風險屬性</h2>
                <InfoPopover label="風險屬性說明">預設為問卷結果，調整後不會改變您的問卷記錄。</InfoPopover>
              </div>
            </div>
            {choicesError ? (
              <p className={styles.helperText}>{choicesError}</p>
            ) : !choices || !profileInputs ? (
              <p className={styles.helperText}>查詢中…</p>
            ) : (
              <div className={styles.fieldGrid}>
                <ChoiceField
                  id="investmentHorizon"
                  label="投資期限"
                  hint="這筆資金預計多久不需動用"
                  choice={choices.investmentHorizon}
                  value={profileInputs.investmentHorizon}
                  onChange={(v) => setProfileInputs({ ...profileInputs, investmentHorizon: v })}
                />
                <ChoiceField
                  id="withdrawalNeed"
                  label="一年內提款可能性"
                  hint="未來 1 年內，提領這筆資金的機率"
                  choice={choices.withdrawalNeed}
                  value={profileInputs.withdrawalNeed}
                  onChange={(v) => setProfileInputs({ ...profileInputs, withdrawalNeed: v })}
                />
                <ChoiceField
                  id="lossTolerance"
                  label="可接受損失區間"
                  hint="1 年內能承受的最大跌幅"
                  choice={choices.lossTolerance}
                  value={profileInputs.lossTolerance}
                  onChange={(v) => setProfileInputs({ ...profileInputs, lossTolerance: v })}
                />
              </div>
            )}
          </Card>

          {/* 2. 投資組合（左，高度比照右側兩張卡的總高）；右側為分析期間與報酬基準兩張卡 */}
          <div className={styles.row2}>
            <Card className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.titleGroup}>
                  <h2 className={styles.sectionTitle}>投資組合</h2>
                </div>
              </div>
              <Select
                id="analysisPortfolio"
                ariaLabel="投資組合"
                value={selected}
                onChange={choose}
                disabled={!items}
                placeholder={items ? "請選擇投資組合" : "載入中…"}
                options={
                  items?.map((p) => ({
                    value: String(p.id),
                    label: p.symbolCount === 0 ? `${p.name}（尚無持股）` : p.name,
                    disabled: p.symbolCount === 0,
                  })) ?? []
                }
              />
              {current && <HoldingsList symbols={current.symbols} />}
            </Card>

            <div className={styles.rightCol}>
              {/* 分析期間：標題列右側直接顯示目前試算出的絕對區間；一律顯示完整內容
                 （未選組合或查詢中時滑桿停用、數值顯示 N/A），排版不會忽大忽小 */}
              <Card className={styles.section}>
                <div className={styles.sectionHead}>
                  <div className={styles.titleGroup}>
                    <h2 className={styles.sectionTitle}>分析期間</h2>
                    {/* 說明框一律有內容：還沒選組合（或查不到）時顯示通則，選好組合後指出是哪幾檔限制了最大期間 */}
                    <InfoPopover label="分析期間說明">
                      {ready && options!.period.limitedBySymbols.length > 0 ? (
                        <>
                          最大期間受限於
                          {options!.period.limitedBySymbols.map((s, i) => (
                            <span key={s}>
                              {i > 0 && "、"}
                              <b>{holdingLabel(s, current)}</b>
                            </span>
                          ))}
                          的掛牌時間。
                        </>
                      ) : (
                        "最大期間受限於掛牌時間。"
                      )}
                    </InfoPopover>
                  </div>
                  {ready && (
                    <span className={styles.rangeText}>
                      <Icon name="schedule" size={16} />
                      {periodStart} ～ {periodEnd}
                    </span>
                  )}
                </div>
                <div className={styles.sliderWrap} ref={sliderWrapRef}>
                  <span ref={badgeRef} className={styles.floatingBadge} style={{ left: badgeLeft }}>
                    {sliderValueText.endsWith("）") ? (
                      <>
                        {sliderValueText.slice(0, -1)}
                        <span className={styles.closingBracket}>）</span>
                      </>
                    ) : (
                      sliderValueText
                    )}
                  </span>
                  <Slider
                    id="analysisYears"
                    min={0}
                    max={ready ? maxIndex : 0}
                    step={1}
                    value={ready ? yearIndex : 0}
                    onChange={setYearIndex}
                    disabled={!ready}
                    aria-label="回看年數"
                    aria-valuetext={sliderValueText}
                  />
                </div>

                {optionsState === "error" && <OptionsErrorPanel error={optionsError!} />}
              </Card>

              {/* 報酬基準：獨立一個區塊，說明以標題右側的提示呈現 */}
              <Card className={styles.section}>
                <div className={styles.sectionHead}>
                  <div className={styles.titleGroup}>
                    <h2 className={styles.sectionTitle}>報酬基準</h2>
                    <InfoPopover label="報酬基準說明">評估投資績效的最低收益標準。</InfoPopover>
                  </div>
                </div>
                <Select
                  id="rateOption"
                  ariaLabel="報酬基準"
                  value={ready ? rateOption : ""}
                  onChange={setRateOption}
                  disabled={!ready}
                  placeholder={optionsState === "idle" ? "請先選擇投資組合" : optionsState === "loading" ? "查詢中…" : "請選擇報酬基準"}
                  options={ready ? options!.rateOptions.map((r) => ({ value: r.key, label: rateOptionLabel(r), disabled: r.rate === null })) : []}
                />
              </Card>
            </div>
          </div>

          {/* 手機版的「開始分析」：放在報酬基準下方、撐滿寬度，填完設定順手就能按（桌機版在標題列右側） */}
          {ready && (
            <Button onClick={start} fullWidth className={styles.startMobile}>開始分析</Button>
          )}
        </>
      )}

      <AlertDialog
        open={confirmed}
        title="分析功能開發中"
        messages={[
          `已確認分析設定：${current?.name ?? NA}，回看${lookbackMonths === null ? "最大期間" : formatMonths(lookbackMonths)}，` +
            `報酬比較基準 ${chosenRate?.label ?? NA}，可接受損失區間 ${profileInputs?.lossTolerance ?? NA}，` +
            `投資期限 ${profileInputs?.investmentHorizon ?? NA}，一年內提款可能性 ${profileInputs?.withdrawalNeed ?? NA}。`,
          "分析報告的計算與呈現將在後續版本提供。",
        ]}
        onConfirm={() => setConfirmed(false)}
      />
    </main>
  );
}

// 【持股標籤清單】每個標籤依內容自然定寬、不拉伸；用隱藏的量測副本取得每個標籤實際寬度後，
// 交給 packRows 決定排列順序與換行位置（不一定照原始順序），讓每列盡量填滿、右側留白最少。
// 一次最多看得到 4 列：桌機時清單高度＝卡片剩下的高度（卡片高度跟右側兩張卡一樣），列距依這個高度算，
// 讓第 4 列的下緣剛好貼齊卡片內容的下緣（也就是報酬基準選單的下緣）；手機時列距固定、最高 4 列。超過 4 列就在清單內捲動。
// 參數：symbols=目前組合的持股清單（代號＋名稱）
function HoldingsList({ symbols }: { symbols: { symbol: string; name: string }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<{ symbol: string; name: string }[][] | null>(null);
  const [layout, setLayout] = useState<{ rowGap: number; maxHeight?: number }>({ rowGap: HOLDINGS_MOBILE_ROW_GAP });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    // 1. 依容器寬度重新排列；2. 依容器高度算列距（寬高改變時都重算）
    const update = () => {
      const chipEls = Array.from(measure.children) as HTMLElement[];
      const items = symbols.map((s, i) => ({ ...s, width: chipEls[i].offsetWidth }));
      setRows(packRows(items, container.clientWidth, HOLDINGS_GAP));
      const chipH = chipEls[0]?.getBoundingClientRect().height ?? 0; // 用未四捨五入的實際高度，第 4 列才會精準貼齊
      if (window.matchMedia("(max-width: 734px)").matches) {
        setLayout({ rowGap: HOLDINGS_MOBILE_ROW_GAP, maxHeight: HOLDINGS_VISIBLE_ROWS * chipH + (HOLDINGS_VISIBLE_ROWS - 1) * HOLDINGS_MOBILE_ROW_GAP });
      } else {
        const gap = (container.clientHeight - HOLDINGS_VISIBLE_ROWS * chipH) / (HOLDINGS_VISIBLE_ROWS - 1);
        setLayout({ rowGap: Math.max(HOLDINGS_MIN_ROW_GAP, gap) });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [symbols]);

  return (
    <div
      ref={containerRef}
      className={styles.holdings}
      style={{ rowGap: layout.rowGap, maxHeight: layout.maxHeight }}
      aria-label="分析的持股"
    >
      {/* 隱藏的量測副本：只用來取得每個標籤依內容渲染出來的實際寬度，不佔版面、不會被看到 */}
      <div ref={measureRef} className={styles.holdingsMeasure} aria-hidden="true">
        {symbols.map((s) => (
          <HoldingChip key={s.symbol} s={s} />
        ))}
      </div>
      {(rows ?? [symbols]).map((row, i) => (
        <div key={i} className={styles.holdingsRow}>
          {row.map((s) => (
            <HoldingChip key={s.symbol} s={s} />
          ))}
        </div>
      ))}
    </div>
  );
}

// 【單一持股標籤】代號粗體＋名稱，過長時橢圓省略（極窄螢幕的保險，一般情況下標籤依內容定寬不會觸發）
function HoldingChip({ s }: { s: { symbol: string; name: string } }) {
  return (
    <span className={styles.holding} title={`${s.symbol} ${s.name}`}>
      <b>{s.symbol}</b>
      <span className={styles.holdingName}>{s.name}</span>
    </span>
  );
}

// 【無法分析的原因】分析選項查詢失敗時顯示：只顯示後端的說明文字（例如「因中光電投控（3718）歷史股價未滿 2 年，……」），
// 不另外加標題或逐檔清單。參數：error=查詢分析選項時的錯誤
function OptionsErrorPanel({ error }: { error: ApiError }) {
  return (
    <div className={`${styles.statusPanel} ${styles.errorPanel}`} role="alert">
      <Icon name="error" size={20} />
      <div>
        <p>{error.message}</p>
      </div>
    </div>
  );
}

// 【可調整的指標】白話說明（樣式比照原本的欄位小標題）＋下拉選單；題目名稱作為選單的無障礙標籤，不重複顯示。
// 參數：id=欄位代號、label=題目名稱（僅供無障礙標籤，不顯示）、hint=白話說明（顯示為小標題）、choice=問卷預設值與選項原文、value=目前的值、onChange=改變時呼叫
function ChoiceField({ id, label, hint, choice, value, onChange }: {
  id: string; label: string; hint: string; choice: ProfileChoice; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.questionText}>{hint}</span>
      <Select id={id} ariaLabel={label} value={value} onChange={onChange} placeholder="請選擇"
        options={choice.choices.map((o) => ({ value: o, label: o }))} />
    </div>
  );
}
