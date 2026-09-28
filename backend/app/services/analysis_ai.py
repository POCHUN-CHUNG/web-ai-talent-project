import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from openai import ContentFilterFinishReasonError, LengthFinishReasonError, OpenAI
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update

from app.db import SessionLocal, redis_client
from app.models import AnalysisReport, AnalysisResult
from app.services.profile_ai import RETRY_WAIT_SECONDS, RETRYABLE_ERRORS, AiNotConfigured, AiOutputInvalid, \
    max_attempts, pending_ttl_seconds, timeout_seconds
from app.services.risk_metrics import DIAGNOSIS_RULES_VERSION

# 【風險分析報告（AI）】把一次分析快照的計算結果交給 OpenAI，產生綜合診斷、四段白話說明與三項建議檢視重點。
# 只解釋、不計算；Prompt 為規格檔（spec/prompts/risk_analysis_*.md），程式只讀取、不改寫。
# 產生流程與風險屬性解析相同：建立分析後在背景產生，狀態 pending → ready／failed，失敗可重新產生。
log = logging.getLogger("analysis_ai")

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"  # 執行期 Prompt 純文字檔位置
SYSTEM_PROMPT_FILE = "risk_analysis_system.txt"  # 系統指令（固定不變，放最前面讓 prompt caching 生效）
USER_PROMPT_FILE = "risk_analysis_user.txt"  # 使用者指令模板
RETRY_PROMPT_FILE = "risk_analysis_retry.txt"  # 內容檢查不通過時，下一次呼叫附上的重試提示模板
PROMPT_CACHE_KEY = "risk_analysis"  # 固定的快取分組名稱
SECTION_KEYS = ["return_market", "loss_risk", "concentration", "personal_alignment"]  # 四段固定順序（報酬效率與市場連動合併為 return_market）
SECTION_FIGURES = {  # 各段可綁定的圖表；未列出的段落不可綁圖
    "loss_risk": {"figure:drawdown_curve"},
    "concentration": {"figure:weight_vs_pcr", "figure:correlation_heatmap"},
}
PROFILE_FIELDS = ["investment_horizon", "withdrawal_need", "loss_tolerance"]  # 送給 AI 的個人條件（Q7、Q8、Q13）
METRIC_ORDER = [  # evidence ref 的指標順序（與契約 MetricId 相同）
    "annualized_volatility", "annualized_downside_deviation", "beta", "r_squared", "max_drawdown",
    "expected_shortfall_95", "skewness", "excess_kurtosis", "hhi", "effective_number_of_holdings",
    "sharpe_ratio", "sortino_ratio",
]
# 字數範圍（Prompt 的建議字數較窄；模型數字數不精確，這裡留寬一點，只擋太短或失控的輸出）
OVERALL_TEXT_LEN = (120, 450)  # 綜合診斷
FEATURE_LEN, FEATURE_COUNT = (4, 30), (2, 3)  # 主要風險特徵：每句字數、句數
FOCUS_LEN = (20, 180)  # 最需要關注的風險來源
SECTION_LEN = (60, 380)  # 每段（return_market 合併兩組，較長）
REVIEW_LEN, REVIEW_COUNT = (15, 100), 3  # 建議檢視重點：每項字數、固定項數
FAILURE_REASON_MAX = 2000  # 失敗原因最多保留字數（僅供除錯）
# 最大回撤對照 Q13 的區間：[下界, 上界)，上界 None 代表沒有上限（「5 - 9 %」視為 5% 以上、未滿 10%）
LOSS_RANGES = {"未滿 5 %": (0.0, 0.05), "5 - 9 %": (0.05, 0.10), "10 - 19 %": (0.10, 0.20),
               "20 - 29 %": (0.20, 0.30), "30 % 以上": (0.30, None)}
PAYLOAD_KEYS = {"period", "settings", "profile_inputs", "personal_alignment", "metrics", "positions", "correlation",
                "interpretation", "diagnosis", "figures", "data_quality"}  # payload 頂層白名單
FORBIDDEN_KEYS = {"user_id", "username", "password", "portfolio_id", "portfolio_name", "cost", "avg_cost", "pnl",
                  "quantity", "price", "buy_date", "lots", "q11_other"} | {f"q{i}" for i in range(1, 15)}  # 任何層級都不得出現
BANNED_TERMS = [  # 使用者看得到的文字中不可出現的字詞（與 Prompt <rules> 的禁用字詞一致）
    "R²", "R2", "HHI", "偏態", "峰度", "下行波動度", "有效持股檔數",  # 後端指標名稱：畫面上看不到，須改用白話描述
    "高於大盤", "低於大盤", "高於市場", "低於市場",  # 與大盤比較須用「比大盤起伏大／風報比優於大盤…」的說法（spec/04 §4.4.11）
    "後端", "典型標籤", "規則報告", "必要訊號", "混合型",  # 內部用語
    "划算", "性價比",  # 口語化的比較，改用「風報比優於大盤／風報比不如大盤」
]
COLOR_WORDS = ["紅色", "藍色", "綠色", "黃色", "橘色", "紫色", "灰色", "暖色", "冷色", "深紅", "深藍", "淺藍", "淺紅"]  # 不可描述圖表顏色
RULE_ID = re.compile(r"(?<![A-Za-z0-9])[ETCM][1-8](?![A-Za-z0-9])")  # 典型標籤的規則編號（E1、T3、C2、M5…）
SECRET_LIKE = re.compile(r"sk-[A-Za-z0-9_\-]{8,}")  # 可能的金鑰字串，寫入失敗原因前遮蔽


class Overall(BaseModel):
    # 【綜合診斷】features=2–3 個主要風險特徵短句、text=綜合說明、focus=最需要關注的風險來源、evidence_refs=依據
    model_config = ConfigDict(extra="forbid")
    features: list[str]
    text: str
    focus: str
    evidence_refs: list[str]


class Section(BaseModel):
    # 【一段報告】key=段落代號、text=內文、evidence_refs=依據、figure_refs=綁定的圖表
    model_config = ConfigDict(extra="forbid")
    key: Literal["return_market", "loss_risk", "concentration", "personal_alignment"]
    text: str
    evidence_refs: list[str]
    figure_refs: list[str]


class ReviewDirection(BaseModel):
    # 【建議檢視重點】text=一項建議檢視的重點、evidence_refs=依據、figure_refs=相關圖表
    model_config = ConfigDict(extra="forbid")
    text: str
    evidence_refs: list[str]
    figure_refs: list[str]


class ReportOutput(BaseModel):
    # 【AI 輸出格式】Structured Outputs 的 schema（不得有其他欄位）
    model_config = ConfigDict(extra="forbid")
    overall: Overall
    sections: list[Section]
    review_directions: list[ReviewDirection]


def _load_prompt(name: str) -> str:
    # 【讀取 Prompt】原樣讀取規格檔，不做任何改寫。參數：name=檔名
    return (PROMPT_DIR / name).read_text(encoding="utf-8")


def prompt_version() -> str:
    # 【Prompt 版本】讀取系統指令開頭的「# prompt_version: x.y.z」，寫入報告供追溯。無參數。
    m = re.search(r"^# prompt_version: (\S+)", _load_prompt(SYSTEM_PROMPT_FILE), re.M)
    return m.group(1) if m else "unknown"


def model_name() -> str:
    # 【模型代號】與風險屬性解析共用 OPENAI_MODEL。無參數。
    return os.getenv("OPENAI_MODEL", "gpt-6-luna")


# ───────────────────────── 組裝送給 AI 的資料 ─────────────────────────


def mdd_vs_loss_tolerance(mdd, loss_tolerance: str) -> str:
    # 【最大回撤 vs 可承受損失區間】|MDD| 達區間上界為超過、低於下界為低於、其餘為落在區間內；無法比較時為無法判斷。
    # 由後端比對，避免模型自己比大小。參數：mdd=最大回撤（負數或 0）、loss_tolerance=Q13 選項原文
    if mdd is None or loss_tolerance not in LOSS_RANGES:
        return "無法判斷"
    low, high = LOSS_RANGES[loss_tolerance]
    depth = abs(mdd)
    if high is not None and depth >= high:
        return "超過可承受損失區間"
    if depth < low:
        return "低於可承受損失區間"
    return "落在可承受損失區間內"


def drawdown_facts(data: dict | None) -> dict | None:
    # 【回撤圖的重點事實】從回撤序列找出最大回撤前的高點日、最低點日、回到前高的日期與經過的交易日數。
    # 代替原本約 1,300 筆的序列送給 AI。參數：data=回撤圖資料（series、trough）；沒有資料時回 None
    if not data or not data.get("series"):
        return None
    series = data["series"]
    trough = next(i for i, p in enumerate(series) if p["date"] == data["trough"]["date"])
    # 1. 高點：最低點之前最後一次位於歷史高點（回撤為 0）的日子
    peak = max(i for i in range(trough + 1) if series[i]["drawdown"] == 0)
    # 2. 回復：最低點之後第一次回到前高（回撤為 0）的日子；從未下跌時視為當天即回復
    recovery = trough if series[trough]["drawdown"] == 0 else next(
        (j for j in range(trough + 1, len(series)) if series[j]["drawdown"] == 0), None)
    return {
        "peak_date": series[peak]["date"],
        "trough_date": series[trough]["date"],
        "trough_drawdown": series[trough]["drawdown"],
        "drawdown_trading_days": trough - peak,
        "recovery_date": None if recovery is None else series[recovery]["date"],
        "recovery_trading_days": None if recovery is None else recovery - trough,
    }


def build_payload(row: AnalysisResult) -> dict:
    # 【組裝送給 AI 的資料】由分析快照取出 Prompt 需要的欄位；期間改用起訖日、圖表只留重點事實，不含帳號、組合名稱與交易資料。
    # 參數：row=分析快照
    profile = {k: row.profile_inputs.get(k) for k in PROFILE_FIELDS}
    profile["changed_fields"] = row.profile_inputs.get("changed_fields", [])
    figures = [{
        "figure_ref": f["figure_ref"], "title": f["title"], "status": f["status"], "reason": f["reason"],
        "facts": drawdown_facts(f["data"]) if f["figure_ref"] == "figure:drawdown_curve" and f["status"] == "available" else None,
    } for f in row.figures]
    payload = {
        "period": {
            "start_date": row.start_date.isoformat(), "end_date": row.end_date.isoformat(), "trading_days": row.trading_days,
            "is_max_period": row.requested_years is None, "limited_by_symbols": row.limited_by,
            "annualization_basis": 252, "weighting_method": "current_market_value", "benchmark_symbol": row.benchmark_symbol,
        },
        "settings": {
            "rate_option": row.rate_option, "risk_free_rate": float(row.risk_free_rate), "mar": float(row.mar),
            "rate_as_of": row.rate_as_of.isoformat().replace("+00:00", "Z") if row.rate_as_of else None,
        },
        "profile_inputs": profile,
        "personal_alignment": {
            "mdd_vs_loss_tolerance": mdd_vs_loss_tolerance(row.metrics["max_drawdown"]["value"], profile["loss_tolerance"]),
        },
        "metrics": row.metrics,
        "positions": row.positions,
        "correlation": row.correlation,
        "interpretation": row.interpretation,
        "diagnosis": row.diagnosis,
        "figures": figures,
        "data_quality": row.data_quality,
    }
    assert_payload_allowed(payload)
    return payload


def assert_payload_allowed(payload: dict) -> None:
    # 【欄位白名單檢查】頂層只能是 PAYLOAD_KEYS，且任何層級都不得出現禁止欄位，否則視為程式錯誤。參數：payload=要送出的資料
    if set(payload) != PAYLOAD_KEYS:
        raise RuntimeError("送入 AI 的資料含有不允許的欄位")

    def walk(node):
        if isinstance(node, dict):
            if FORBIDDEN_KEYS & set(node):
                raise RuntimeError("送入 AI 的資料含有禁止的欄位")
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(payload)


def evidence_refs(payload: dict) -> list[str]:
    # 【可引用的依據清單】依固定順序列出本次所有 evidence ref（見 spec/prompts/risk_analysis_user.md）。參數：payload=送出的資料
    refs = ["period", "settings", "interpretation", "data_quality", "personal_alignment"]
    refs += [f"metric:{k}" for k in METRIC_ORDER if payload["metrics"].get(k, {}).get("status") == "available"]
    refs += [f"holding:{p['symbol']}" for p in payload["positions"]]
    refs += [f"risk_contribution:{p['symbol']}" for p in payload["positions"] if p["pcr"] is not None]
    symbols, matrix = payload["correlation"]["symbols"], payload["correlation"]["matrix"]
    refs += [f"corr:{symbols[i]}:{symbols[j]}" for i in range(len(symbols)) for j in range(i + 1, len(symbols))
             if matrix[i][j] is not None]
    refs += [f"diagnosis:{g['key']}" for g in payload["diagnosis"]["groups"]]
    refs += [f"signal:{s['id']}" for s in payload["diagnosis"]["overall"]["adverse_signals"]]
    refs += [f"profile:{k}" for k in PROFILE_FIELDS]
    return list(dict.fromkeys(refs))  # 去重並保留順序


def figure_refs(payload: dict) -> list[str]:
    # 【可引用的圖表清單】只收可呈現的圖，順序與 figures 相同。參數：payload=送出的資料
    return [f["figure_ref"] for f in payload["figures"] if f["status"] == "available"]


def render_user_prompt(payload: dict) -> str:
    # 【組使用者指令】只替換四個佔位符，其餘文字不動。參數：payload=送出的資料
    text = _load_prompt(USER_PROMPT_FILE)
    text = text.replace("{{validated_payload_json}}", json.dumps(payload, ensure_ascii=False, indent=2))
    text = text.replace("{{available_evidence_refs_json}}", json.dumps(evidence_refs(payload), ensure_ascii=False))
    text = text.replace("{{available_figure_refs_json}}", json.dumps(figure_refs(payload), ensure_ascii=False))
    return text.replace("{{diagnosis_rules_version}}", DIAGNOSIS_RULES_VERSION)


# ───────────────────────── 檢查 AI 輸出 ─────────────────────────


def _check_len(text: str, bounds: tuple[int, int], where: str) -> None:
    # 【字數檢查】去頭尾空白後的字數須在範圍內。參數：text=文字、bounds=(最少, 最多)、where=錯誤訊息用的位置名稱
    if not bounds[0] <= len(text.strip()) <= bounds[1]:
        raise AiOutputInvalid(f"{where} 字數需介於 {bounds[0]} 至 {bounds[1]} 字")


def _check_refs(refs: list[str], allowed: set, where: str, required: bool = False) -> None:
    # 【引用檢查】每一項都必須在白名單內；required 為 True 時至少一項。參數：refs=引用清單、allowed=白名單、where=位置名稱
    if required and not refs:
        raise AiOutputInvalid(f"{where} 沒有列出依據")
    bad = [r for r in refs if r not in allowed]
    if bad:
        raise AiOutputInvalid(f"{where} 引用了清單外的項目：{'、'.join(bad)}")


def all_texts(content: dict) -> list[tuple[str, str]]:
    # 【取出全部文字】報告中所有會顯示給使用者的文字，附上所在位置（重試提示要告訴 AI 錯在哪）。參數：content=AI 輸出
    o = content["overall"]
    return ([("overall.features", f) for f in o["features"]] + [("overall.text", o["text"]), ("overall.focus", o["focus"])]
            + [(f"sections.{s['key']}", s["text"]) for s in content["sections"]]
            + [("review_directions", r["text"]) for r in content["review_directions"]])


def text_problems(where: str, text: str, labels: list[str]) -> list[str]:
    # 【單段文字的問題】列出這段文字的所有違規（空白、驚嘆號、禁用字詞、典型標籤、規則編號、顏色）。
    # 參數：where=所在位置、text=文字、labels=本次的典型標籤（含引號）
    if not text.strip():
        return [f"{where} 是空白"]
    found = []
    if "!" in text or "！" in text:
        found.append(f"{where} 含驚嘆號")
    terms = [t for t in BANNED_TERMS if t in text] + [m.group(0) for m in RULE_ID.finditer(text)]
    if terms:
        found.append(f"{where} 含禁用字詞：{'、'.join(dict.fromkeys(terms))}")
    if any(label in text for label in labels):
        found.append(f"{where} 照抄了典型標籤")
    colors = [c for c in COLOR_WORDS if c in text]
    if colors:
        found.append(f"{where} 描述了圖表顏色：{'、'.join(colors)}")
    return found


def validate_report(content: dict, payload: dict) -> dict:
    # 【檢查 AI 內容】schema 只管格式，這裡再確認內容對得上輸入；通過回傳原資料，不通過丟 AiOutputInvalid。
    # 參數：content=AI 回傳的報告、payload=送出的資料
    refs, figs = set(evidence_refs(payload)), figure_refs(payload)
    o = content["overall"]
    # 1. 綜合診斷
    if not FEATURE_COUNT[0] <= len(o["features"]) <= FEATURE_COUNT[1]:
        raise AiOutputInvalid(f"主要風險特徵需為 {FEATURE_COUNT[0]}–{FEATURE_COUNT[1]} 句")
    for f in o["features"]:
        _check_len(f, FEATURE_LEN, "主要風險特徵")
    _check_len(o["text"], OVERALL_TEXT_LEN, "綜合診斷")
    _check_len(o["focus"], FOCUS_LEN, "最需要關注的風險來源")
    _check_refs(o["evidence_refs"], refs, "綜合診斷", required=True)
    # 2. 四段齊全、順序正確，圖表只綁到對應段落
    if [s["key"] for s in content["sections"]] != SECTION_KEYS:
        raise AiOutputInvalid("段落不是依序的四段")
    for s in content["sections"]:
        _check_len(s["text"], SECTION_LEN, s["key"])
        _check_refs(s["evidence_refs"], refs, s["key"], required=True)
        _check_refs(s["figure_refs"], SECTION_FIGURES.get(s["key"], set()) & set(figs), f"{s['key']} 的圖表")
    # 3. 建議檢視重點：固定三項
    if len(content["review_directions"]) != REVIEW_COUNT:
        raise AiOutputInvalid(f"建議檢視重點需為 {REVIEW_COUNT} 項")
    for r in content["review_directions"]:
        _check_len(r["text"], REVIEW_LEN, "建議檢視重點")
        _check_refs(r["evidence_refs"], refs, "建議檢視重點")
        _check_refs(r["figure_refs"], set(figs), "建議檢視重點的圖表")
    # 4. 使用者看得到的文字：不可有驚嘆號、禁用字詞、典型標籤原文、規則編號或顏色描述
    # 一次列出全部違規，重試時 AI 才能一次改完
    labels = [f"「{g['typical_label']}」" for g in payload["diagnosis"]["groups"] if g.get("typical_label")]
    problems = [p for where, text in all_texts(content) for p in text_problems(where, text, labels)]
    if problems:
        raise AiOutputInvalid("；".join(problems))
    return content


# ───────────────────────── 呼叫 AI ─────────────────────────


def render_retry_prompt(errors: str) -> str:
    # 【組重試提示】只替換佔位符，其餘文字不動。參數：errors=上一次內容檢查不通過的原因
    return _load_prompt(RETRY_PROMPT_FILE).replace("{{validation_errors}}", errors)


def _call_openai(user_prompt: str, retry_prompt: str | None = None) -> dict:
    # 【呼叫 OpenAI】送出一次請求並回傳解析後的報告；未設金鑰丟 AiNotConfigured，輸出不完整或拒答丟 AiOutputInvalid。
    # 重試提示放在第二則訊息，前面的系統指令與使用者指令完全不變，仍可命中 prompt caching。
    # 參數：user_prompt=已組好的使用者指令、retry_prompt=上一次內容檢查不通過時的重試提示（第一次為 None）
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise AiNotConfigured()
    # 1. 關掉套件自己的重試，統一由 generate_report 控制次數與間隔
    client = OpenAI(api_key=api_key, timeout=timeout_seconds(), max_retries=0)
    try:
        # 2. 固定的系統指令放 instructions、變動資料放 input，開頭相同的部分會被自動快取
        resp = client.responses.parse(
            model=model_name(),
            instructions=_load_prompt(SYSTEM_PROMPT_FILE),
            input=user_prompt if retry_prompt is None else [
                {"role": "user", "content": user_prompt}, {"role": "user", "content": retry_prompt}],
            text_format=ReportOutput,
            reasoning={"effort": os.getenv("OPENAI_REASONING_EFFORT", "low")},
            max_output_tokens=int(os.getenv("OPENAI_MAX_OUTPUT_TOKENS", "8000")),
            prompt_cache_key=PROMPT_CACHE_KEY,
            store=False,  # 不在 OpenAI 端保存這次對話
        )
    except (ValueError, LengthFinishReasonError, ContentFilterFinishReasonError) as e:  # JSON 或 schema 解析失敗、被截斷、被過濾
        raise AiOutputInvalid(f"輸出無法解析：{type(e).__name__}") from e
    # 3. 沒有完整完成（例如輸出上限不夠）或拒答時沒有解析結果
    if resp.status != "completed" or resp.output_parsed is None:
        raise AiOutputInvalid(f"輸出不完整或拒答（status={resp.status}）")
    usage = resp.usage
    if usage:
        log.info("風險分析報告 token：輸入 %s（快取 %s）、輸出 %s（推理 %s）", usage.input_tokens,
                 usage.input_tokens_details.cached_tokens, usage.output_tokens, usage.output_tokens_details.reasoning_tokens)
    return resp.output_parsed.model_dump()


def generate_report(payload: dict, call=_call_openai, sleep=time.sleep) -> dict:
    # 【產生報告】呼叫 AI 並檢查內容；值得重試的失敗最多共呼叫 OPENAI_MAX_ATTEMPTS 次，間隔 2、5 秒。
    # 內容檢查不通過時，下一次附上重試提示告訴 AI 上次錯在哪，提高第二次就通過的機會。
    # 參數：payload=送出的資料、call=呼叫函式（測試時可替換）、sleep=等待函式（測試時可替換）
    user_prompt = render_user_prompt(payload)
    attempts = max_attempts()
    retry_prompt = None
    for attempt in range(1, attempts + 1):
        try:
            return validate_report(call(user_prompt, retry_prompt), payload)
        except RETRYABLE_ERRORS as e:
            log.warning("風險分析報告第 %d 次失敗：%s", attempt, e)
            retry_prompt = render_retry_prompt(str(e)) if isinstance(e, AiOutputInvalid) else None
            if attempt == attempts:
                raise
            sleep(RETRY_WAIT_SECONDS[min(attempt - 1, len(RETRY_WAIT_SECONDS) - 1)])
    raise AiOutputInvalid("未取得輸出")  # attempts 設為 0 以下時才會到這裡


# ───────────────────────── 狀態與背景工作 ─────────────────────────


def _now() -> datetime:
    # 【目前時間】UTC。無參數。
    return datetime.now(timezone.utc)


def _pending_key(analysis_id: int) -> str:
    # 【產生中標記的鍵】參數：analysis_id=分析編號
    return f"report_pending:{analysis_id}"


def mark_pending(analysis_id: int) -> None:
    # 【登記「產生中」】標記過期仍是 pending，代表工作已中斷（例如後端重啟），讀取時會改判 failed。參數：analysis_id=分析編號
    redis_client.set(_pending_key(analysis_id), 1, ex=pending_ttl_seconds())


def clear_pending(analysis_id: int) -> None:
    # 【清除「產生中」標記】分析被刪除時一併清掉，不留下無用的鍵。參數：analysis_id=分析編號
    redis_client.delete(_pending_key(analysis_id))


def get_report(db, analysis_id: int) -> AnalysisReport | None:
    # 【查報告】一次分析最多一份報告。參數：db=資料庫連線、analysis_id=分析編號
    return db.scalar(select(AnalysisReport).where(AnalysisReport.analysis_result_id == analysis_id))


def create_pending(db, analysis_id: int) -> AnalysisReport:
    # 【建立待產生的報告】新增一列 pending 並登記產生中；呼叫端負責排入背景工作。參數：db=資料庫連線、analysis_id=分析編號
    report = AnalysisReport(analysis_result_id=analysis_id, status="pending", attempt=1)
    db.add(report)
    db.commit()
    db.refresh(report)
    mark_pending(analysis_id)
    return report


def save_report(analysis_id: int, content: dict | None, status: str, failure_reason: str | None = None) -> None:
    # 【寫入結果】只有仍是 pending 的報告可以寫入一次結果。
    # 參數：analysis_id=分析編號、content=報告內容（失敗時為空）、status=ready 或 failed、failure_reason=失敗原因
    values = {"content": content, "status": status, "updated": _now()}
    if status == "ready":
        values |= {"model": model_name(), "prompt_version": prompt_version(), "failure_reason": None}
    else:
        values["failure_reason"] = SECRET_LIKE.sub("sk-***", failure_reason or "未知錯誤")[:FAILURE_REASON_MAX]
    with SessionLocal() as db:
        db.execute(
            update(AnalysisReport)
            .where(AnalysisReport.analysis_result_id == analysis_id, AnalysisReport.status == "pending")
            .values(**values)
        )
        db.commit()


def fail_if_stale(db, report: AnalysisReport) -> None:
    # 【逾時判失敗】狀態是 pending 但「產生中」標記已過期，改成 failed 讓使用者能重新產生。
    # 參數：db=資料庫連線、report=報告（會就地更新）
    if report.status != "pending" or redis_client.exists(_pending_key(report.analysis_result_id)):
        return
    db.execute(
        update(AnalysisReport)
        .where(AnalysisReport.id == report.id, AnalysisReport.status == "pending")
        .values(status="failed", failure_reason="產生逾時或中斷", updated=_now())
    )
    db.commit()
    db.refresh(report)


def reset_to_pending(analysis_id: int) -> bool:
    # 【重新產生前置】只有 failed 的報告能改回 pending，並把產生輪次加 1；成功回 True，狀態不符回 False。
    # 參數：analysis_id=分析編號
    with SessionLocal() as db:
        n = db.execute(
            update(AnalysisReport)
            .where(AnalysisReport.analysis_result_id == analysis_id, AnalysisReport.status == "failed")
            .values(status="pending", attempt=AnalysisReport.attempt + 1, content=None, updated=_now())
        ).rowcount
        db.commit()
    return n == 1


def run_report_job(analysis_id: int) -> None:
    # 【背景工作：產生報告】回應送出後才執行：讀快照 → 組資料 → 呼叫 AI → 寫回；任何失敗都標為 failed，不影響分析數值與圖表。
    # 參數：analysis_id=分析編號
    try:
        # 1. 讀取快照並組資料
        with SessionLocal() as db:
            payload = build_payload(db.get(AnalysisResult, analysis_id))
        # 2. 產生並檢查報告
        content = generate_report(payload)
        # 3. 寫回
        save_report(analysis_id, content, "ready")
    except AiNotConfigured:
        log.warning("未設定 OPENAI_API_KEY，風險分析報告標為 failed")
        save_report(analysis_id, None, "failed", "未設定 OPENAI_API_KEY")
    except Exception as e:  # 重試用盡、金鑰錯誤、請求錯誤等一律降級
        log.exception("風險分析報告產生失敗")
        save_report(analysis_id, None, "failed", f"{type(e).__name__}: {e}")


def serialize_report(report: AnalysisReport | None, analysis_id: int) -> dict:
    # 【報告轉回應】前端只需要狀態與內容；模型、Prompt 版本與失敗原因僅供除錯，不回傳。
    # 參數：report=報告（尚未建立時為 None）、analysis_id=分析編號
    return {
        "analysis_id": analysis_id,
        "status": report.status if report else None,
        "attempt": report.attempt if report else None,
        "content": report.content if report and report.status == "ready" else None,
        "updated": report.updated.isoformat().replace("+00:00", "Z") if report else None,
    }
