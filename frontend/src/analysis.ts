// 【風險分析共用定義】報告頁、歷史紀錄頁與投資組合詳情頁共用的資料型別、指標文字與格式化函式。
// 資料格式以 spec/03-contract.md §3.1（AnalysisResult、AnalysisReport）與 §3.3（歷史清單）為準；
// 畫面上的白話文字以 spec/04-behavior.md §4.4.11 為準。
import { NA, pct } from "./format";

// ─────────────────────────── 資料型別 ───────────────────────────

// 一項純量指標：value=值（null＝無法計算）、benchmark_value=大盤（台股加權報酬指數）以同一公式算出的對照值、reason=無法計算的原因
export type Metric = {
  value: number | null;
  benchmark_value: number | null;
  unit: "fraction" | "ratio" | "count";
  status: "available" | "unavailable";
  reason: string | null;
};
// 一檔持股的權重與風險貢獻：pcr=風險貢獻比例（全部加總 100%，可為負）
export type AnalysisPosition = { symbol: string; name: string; weight: number; rc: number | null; pcr: number | null };
// 一組後端風險分析（只給 AI 閱讀；前端只取 signals 做「與大盤比較」的標示，典型標籤不顯示）
export type DiagnosisGroup = { key: string; signals: Record<string, string | boolean> };
// 一張圖的描述：legend_text=固定的看圖說明（畫面改用 CHART_TERMS 的閱讀指引，不再顯示）、reason=無法呈現的原因、data=回撤圖的資料（其餘兩張圖為 null）
export type Figure = {
  figure_ref: "figure:drawdown_curve" | "figure:weight_vs_pcr" | "figure:correlation_heatmap";
  title: string;
  legend_text: string;
  status: "available" | "unavailable";
  reason: string | null;
  data: { series: { date: string; nav_index: number; drawdown: number }[]; trough: { date: string; drawdown: number } } | null;
};
// 本次分析採用的三項個人條件（問卷選項原文）與被調整過的欄位
export type ProfileInputs = {
  investment_horizon: string;
  withdrawal_need: string;
  loss_tolerance: string;
  changed_fields: string[];
};
// 一次分析的唯讀快照（GET /analysis/{id}）
export type AnalysisResult = {
  id: number;
  portfolio_id: number;
  period: {
    requested_years: number | null;
    max_years: number;
    start_date: string;
    end_date: string;
    trading_days: number;
    limited_by_symbols: string[];
    benchmark_symbol: string;
  };
  settings: { rate_option: "zero" | "bank_average"; risk_free_rate: number; mar: number; rate_as_of: string | null };
  profile_inputs: ProfileInputs;
  metrics: Record<string, Metric>;
  positions: AnalysisPosition[];
  correlation: { symbols: string[]; matrix: (number | null)[][] };
  interpretation: { skew_class: string; sortino_preferred: boolean };
  diagnosis: { groups: DiagnosisGroup[] };
  figures: Figure[];
  data_quality: { notes: string[]; tail_count: number };
  created: string;
  report_status: ReportStatus | null;
};
export type ReportStatus = "pending" | "ready" | "failed";
// AI 報告內容（spec/03-contract.md ReportContent）
export type ReportContent = {
  overall: { features: string[]; text: string; focus: string };
  sections: { key: string; text: string; figure_refs: string[] }[];
  review_directions: { text: string }[];
};
// GET /analysis/{id}/report 的回應
export type AnalysisReport = { analysis_id: number; status: ReportStatus | null; attempt: number | null; content: ReportContent | null };
// 歷史清單的一筆（GET /analysis/history）
export type HistoryItem = {
  id: number;
  created: string;
  portfolio: { id: number; name: string };
  period: { requested_years: number | null; start_date: string; end_date: string; trading_days: number };
  settings: { rate_option: "zero" | "bank_average"; risk_free_rate: number };
  profile_inputs: ProfileInputs;
  metrics: Record<string, { value: number | null; benchmark_value: number | null }>; // 六項摘要指標（最大回撤、年化波動度、95% 預期短缺、Beta、夏普、索丁諾）
  report_status: ReportStatus | null;
  report_features: string[] | null;
};
export type HistoryPage = { items: HistoryItem[]; page: number; page_size: number; total: number };

// ─────────────────────────── 畫面文字 ───────────────────────────

export const BENCHMARK_FULL = "大盤（台股加權報酬指數）"; // 同一畫面第一次提到大盤時的完整稱呼（§4.4.11）

// 四段報告的標題（依 Prompt 的段落代號；報酬效率與市場連動為原「風險與報酬」與「市場敏感與風險來源」合併）
export const SECTION_TITLES: Record<string, string> = {
  return_market: "報酬效率與市場連動",
  loss_risk: "虧損風險",
  concentration: "集中與分散",
  personal_alignment: "個人投資條件適配度",
};

// 三項個人條件的欄位名稱（與風險分析頁的欄位一致）
export const PROFILE_LABELS: Record<string, string> = {
  investment_horizon: "投資期限",
  withdrawal_need: "一年內提款可能性",
  loss_tolerance: "可承受損失區間",
};

// 報酬比較基準選項的詳細解釋（風險分析頁的下拉選單、報告頁與歷史卡片共用同一套文字）
export const RATE_DESCRIPTIONS: Record<string, string> = {
  zero: "本金不虧損",
  bank_average: "五大公股銀行一年期定存利率",
};

// 【報酬比較基準文字】與風險分析頁下拉選單的選項完全相同：「利率（詳細解釋）」，例如「1.692 %（五大公股銀行一年期定存利率）」、
// 「0 %（本金不虧損）」。參數：option=利率選項、rate=年利率（小數）
export function rateLabel(option: string, rate: number): string {
  const value = rate === 0 ? "0 %" : `${(rate * 100).toFixed(3)} %`;
  return `${value}（${RATE_DESCRIPTIONS[option] ?? option}）`;
}

// 報告頁標題下方固定的提示語（不經 AI，§4.4.11〈分析報告的固定文字〉）；報告產生中也先顯示
export const REPORT_NOTICE = "基於歷史調整後收盤價（已還原除權息）與固定持股配置進行回溯，非實際交易損益，且過往表現不代表未來投資績效。";

// 一張前端指標卡的定義：key=指標代號、label=名稱、plain=白話說明、term=名詞解釋、kind=數值格式、
// signal=與大盤比較用的後端訊號（組別代號＋訊號欄位）、words=訊號對應的白話比較說法
type MetricDef = {
  key: string;
  label: string; // 指標卡上的名稱
  fullName: string; // 說明框標題（中文加英文原名）
  term: string; // 名詞解釋
  guide: string; // 閱讀指引
  kind: "loss" | "percent" | "ratio";
  signal: [group: string, field: string];
  words: Record<string, string>;
};

const RISK_WORDS = { 高於市場: "比大盤起伏大", 大致相當: "和大盤差不多", 低於市場: "比大盤穩" };
const RATIO_WORDS = { 高於市場: "性價比優於大盤", 大致相當: "和大盤差不多", 低於市場: "性價比不如大盤" };

// 報告頁的六張指標卡（風險貢獻度與相關係數以圖表呈現）；說明框先放名詞解釋、再放閱讀指引，文字見 spec/04-behavior.md §4.4.11〈指標卡文字〉
export const METRIC_CARDS: MetricDef[] = [
  {
    key: "max_drawdown", label: "最大回撤", fullName: "最大回撤（Max Drawdown）", kind: "loss", signal: ["loss_risk", "mdd"],
    term: "統計期間內，投資組合從波段最高點跌落至最低點的最大累積跌幅。",
    guide: "代表「最差情況模擬」。想像不幸買在歷史最高峰時，跌到谷底所面臨的最大帳面虧損。若此數值超過您的心理底線，代表市場重挫時可能難以承受，建議適度調降波動部位。",
    words: { 深於市場: "比大盤跌得深", 大致相當: "和大盤差不多", 淺於市場: "比大盤跌得淺" },
  },
  {
    key: "annualized_volatility", label: "年化波動度", fullName: "年化波動度（Annualized Volatility）", kind: "percent", signal: ["risk_return", "volatility"],
    term: "將每日價格漲跌幅度的離散程度，換算為全年的波動大小。",
    guide: "衡量「價格震盪幅度」。數值越大，代表資產漲跌起伏越劇烈；通常大多數年份的投資組合報酬率，會落在「平均報酬率 ± 波動度」的範圍內。",
    words: RISK_WORDS,
  },
  {
    key: "expected_shortfall_95", label: "95% 預期短缺", fullName: "95% 預期短缺（Expected Shortfall／CVaR）", kind: "percent", signal: ["loss_risk", "es"],
    term: "在表現最差的 5% 極端交易日中，投資組合平均每日的虧損幅度。",
    guide: "衡量「極端行情的平均重傷程度」。這相當於每 20 個交易日（約一個月）遇到一次大跌時，當天預期會虧損多少，適合用來評估黑天鵝事件下的下檔風險。",
    words: RISK_WORDS,
  },
  {
    key: "beta", label: "Beta", fullName: "Beta（貝他值）", kind: "ratio", signal: ["market_sensitivity", "beta"],
    term: "投資組合相較於市場大盤漲跌的敏感度指標。",
    guide: "用來判斷「投資組合震盪是否比大盤更劇烈」。例如 Beta 為 1.2，代表歷史上大盤每漲跌 1%，該組合平均跟著漲跌約 1.2%（此為歷史統計關聯，非未來保證）。大於 1 代表比大盤活潑，小於 1 則相對抗震。",
    words: { 對市場較敏感: "比大盤敏感", 敏感度接近市場: "和大盤差不多", 對市場較不敏感: "比大盤不敏感", 與市場呈反方向敏感關係: "和大盤反方向變動" },
  },
  {
    key: "sharpe_ratio", label: "夏普比率", fullName: "夏普比率（Sharpe Ratio）", kind: "ratio", signal: ["risk_return", "sharpe"],
    term: "超額報酬（投資組合報酬減去比較基準利率）除以總體波動度，衡量每承擔一單位總風險所換取的超額回報。",
    guide: "代表「承擔風險的性價比」。性價比就是「付出多少代價、換得多少好處」：這裡的代價是價格起伏（漲和跌都算），好處是超過比較基準的報酬，也就是每承擔一分價格起伏，換得多少超過比較基準的報酬。數值越高，代表承受價格震盪所換來的回報越多；一般而言大於 1 即屬良好表現。",
    words: RATIO_WORDS,
  },
  {
    key: "sortino_ratio", label: "索丁諾比率", fullName: "索丁諾比率（Sortino Ratio）", kind: "ratio", signal: ["risk_return", "sortino"],
    term: "超額報酬（投資組合報酬減去比較基準利率）除以下跌波動度，衡量每承擔一單位下跌風險所換取的超額回報。",
    guide: "代表「承擔下跌風險的性價比」。這裡的代價只算下跌的起伏，也就是每承擔一分下跌起伏，換得多少超過比較基準的報酬。數值越高，代表承受下跌震盪所換來的回報越多；上漲的波動不計入風險。因為代價的算法和夏普比率不同，兩者的數字不能直接比較大小。",
    words: RATIO_WORDS,
  },
];

// 三張圖的說明框（§4.4.11「圖」三列）：與指標卡相同的「完整名稱 → 名詞解釋 → 閱讀指引」三段；
// title=圖表標題（較早的分析快照存的是舊標題「相關係數熱圖」，畫面一律以這裡為準）
export const CHART_TERMS: Record<string, { title: string; fullName: string; term: string; guide: string }> = {
  "figure:drawdown_curve": {
    title: "回撤走勢", fullName: "回撤走勢（Drawdown）",
    term: "每一天的投資組合價值，距離「到當天為止最高點」下跌的幅度；0% 代表正位於新的高點。",
    guide: "代表「從高點跌下來有多深」。曲線越往下，代表距離先前高點越遠；最低點就是這段期間的最大回撤，曲線回到 0% 則代表已回到前高，兩者之間的距離就是等待回本的時間。",
  },
  "figure:correlation_heatmap": {
    title: "相關係數", fullName: "相關係數（Correlation Coefficient）",
    term: "衡量兩檔持股每日漲跌方向是否一致的指標，數值介於 −1 到 +1 之間。",
    guide: "代表「持股之間是否常常一起漲跌」。接近 +1 代表常常一起漲跌，接近 0 代表各走各的，接近 −1 代表常常一漲一跌；若主要持股大多接近 +1，即使持有很多檔，分散風險的效果也可能有限。",
  },
  "figure:weight_vs_pcr": {
    title: "風險貢獻度", fullName: "風險貢獻度（Risk Contribution）",
    term: "每檔持股對整個投資組合漲跌起伏的影響占比，全部加起來為 100%。",
    guide: "代表「風險實際來自哪幾檔」。長條越長，代表這檔帶來的風險越大；若風險貢獻比例明顯高於資金占比，表示這檔的起伏較大或與其他持股常常一起漲跌，不一定是放最多錢的那一檔。",
  },
};

// 【大盤對照值】Beta 是「相對大盤」的指標，大盤對自己的 Beta 恆為 1；較早的分析快照沒有存這個值，這裡補上。
// 參數：key=指標代號、m=指標（value 與 benchmark_value）
export function benchmarkOf(key: string, m: { value: number | null; benchmark_value: number | null } | undefined): number | null {
  if (key === "beta" && m?.value != null) return m.benchmark_value ?? 1;
  return m?.benchmark_value ?? null;
}

// 索丁諾提示（§4.4.11）
// 只在偏態明顯（|偏態| ≥ 0.5，樣本 30 筆以上）且索丁諾可計算時顯示：夏普比率把上漲與下跌的起伏都算成風險，
// 漲跌不對稱時會失真，索丁諾比率只計算下跌的起伏，較能反映實際的性價比
export const SORTINO_HINTS: Record<string, string> = {
  positive_skew: "這段期間偶發的大漲比大跌更突出。夏普比率會把上漲的起伏也算成風險，可能低估這個組合的性價比；建議以只計算下跌起伏的索丁諾比率為主要參考。",
  negative_skew: "這段期間偶發的大跌比大漲更突出。夏普比率把上漲與下跌的起伏一視同仁，較難看出下跌帶來的風險；建議同時參考只計算下跌起伏的索丁諾比率。",
};

// ─────────────────────────── 格式化 ───────────────────────────

// 【指標值文字】回撤顯示為「−32.10 %」（保留負號、用全形減號避免與連字號混淆）；比例為百分比 2 位；比值為小數 2 位；無值為「N/A」。
// 數字與單位之間一律半形空格。參數：v=值、kind=數值格式
export function metricText(v: number | null | undefined, kind: "loss" | "percent" | "ratio"): string {
  if (v == null) return NA;
  if (kind === "ratio") return v.toFixed(2);
  const text = (x: number) => pct(x).replace("%", " %");
  if (kind === "loss") return v === 0 ? "0.00 %" : `−${text(Math.abs(v))}`;
  return text(v);
}

// 【與大盤比較的白話標示】依後端訊號轉成「比大盤起伏大／性價比優於大盤…」；訊號為「無法判斷」或沒有對應說法時回 null（不顯示標示）。
// 參數：result=分析快照、def=指標卡定義
export function compareText(result: AnalysisResult, def: MetricDef): string | null {
  const [group, field] = def.signal;
  const s = result.diagnosis.groups.find((g) => g.key === group)?.signals[field];
  return typeof s === "string" ? def.words[s] ?? null : null;
}

// 【指標數值拆成數字與單位】畫面上單位（%）要縮小、改一般文字色，所以把「−30.44 %」拆成「−30.44」與「%」；
// 比值與「N/A」沒有單位。參數：v=值、kind=數值格式
export function metricParts(v: number | null | undefined, kind: "loss" | "percent" | "ratio"): { num: string; unit: string } {
  const text = metricText(v, kind);
  return text.endsWith(" %") ? { num: text.slice(0, -2), unit: "%" } : { num: text, unit: "" };
}

// 【分析期間文字】「2019-04-12 ～ 2026-09-25」。參數：p=期間（起訖日）
export function periodText(p: { start_date: string; end_date: string }): string {
  return `${p.start_date} ～ ${p.end_date}`;
}
