import json
import logging
import os
import time
from pathlib import Path
from typing import Literal

from openai import APIConnectionError, ContentFilterFinishReasonError, InternalServerError, LengthFinishReasonError, \
    OpenAI, RateLimitError
from pydantic import BaseModel, ConfigDict
from sqlalchemy import update

from app.db import SessionLocal, redis_client
from app.models import RiskProfile
from app.services.questionnaire import RULES_VERSION

# 【風險屬性解析（AI）】把已算好的問卷結果（facts、findings）交給 OpenAI，產生四段客製化解析。
# 只解釋、不計算；Prompt 為規格檔（spec/prompts/），程式只讀取、不改寫。
log = logging.getLogger("profile_ai")

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"  # 執行期 Prompt 純文字檔位置
SYSTEM_PROMPT_FILE = "risk_profile_system.txt"  # 系統指令（固定不變，放最前面讓 prompt caching 生效）
USER_PROMPT_FILE = "risk_profile_user.txt"  # 使用者指令模板
PROMPT_CACHE_KEY = "risk_profile"  # 固定的快取分組名稱，讓同樣開頭的請求盡量打到同一份快取
SECTION_KEYS = ["funding_timing", "willingness_capacity", "decline_response", "knowledge_experience"]  # 四段固定順序
CORE_FACT_IDS = ["loss_tolerance", "investment_horizon", "liquidity_need", "financial_capacity"]  # 必須被引用的四個核心指標
BODY_MIN, BODY_MAX = 80, 360  # 每段內文的合理字數（Prompt 要求 180–300 字；模型數字數不精確，這裡留寬一點，只擋太短或失控的輸出）
RETRY_WAIT_SECONDS = [2, 5]  # 第 1、2 次重試前的等待秒數
FORBIDDEN_KEYS = {"user_id", "username", "password", "answers", "q11_other", "q11Other"} | {f"q{i}" for i in range(1, 15)}


class Section(BaseModel):
    # 【一段解析】key=段落代號、body=內文、fact_ids=引用的事實、finding_ids=說明的交叉分析（不得有其他欄位）
    model_config = ConfigDict(extra="forbid")
    key: Literal["funding_timing", "willingness_capacity", "decline_response", "knowledge_experience"]
    body: str
    fact_ids: list[str]
    finding_ids: list[str]


class ProfileOutput(BaseModel):
    # 【AI 輸出格式】Structured Outputs 的 schema：只有 sections 陣列
    model_config = ConfigDict(extra="forbid")
    sections: list[Section]


class AiNotConfigured(Exception):
    # 【未設定 AI 金鑰】.env 沒有 OPENAI_API_KEY 時丟出（不重試）。
    pass


class AiOutputInvalid(Exception):
    # 【AI 輸出不合規】格式不符、被拒答、輸出不完整或內容檢查不通過時丟出（會重試）。
    pass


# 值得重試的失敗：輸出不合規、連線中斷或逾時、呼叫太頻繁（429）、OpenAI 伺服器錯誤（5xx）；金鑰錯誤等其他失敗重試也不會成功
RETRYABLE_ERRORS = (AiOutputInvalid, APIConnectionError, RateLimitError, InternalServerError)


def _max_attempts() -> int:
    # 【總呼叫次數】含第一次，預設 3 次。無參數。
    return int(os.getenv("OPENAI_MAX_ATTEMPTS", "3"))


def _timeout_seconds() -> int:
    # 【單次逾時秒數】預設 60 秒。無參數。
    return int(os.getenv("OPENAI_TIMEOUT_SECONDS", "60"))


def build_payload(profile: RiskProfile) -> dict:
    # 【組裝送給 AI 的資料】資料表存的 facts、findings 就是 Prompt 要的格式，原樣帶出；不含帳號與原始作答。
    # 參數：profile=風險屬性快照
    payload = {"facts": profile.facts, "findings": profile.findings}
    assert_payload_allowed(payload)
    return payload


def assert_payload_allowed(payload: dict) -> None:
    # 【欄位白名單檢查】頂層只能有 facts、findings，且任何層級都不得出現禁止欄位，否則視為程式錯誤。參數：payload=要送出的資料
    if set(payload) != {"facts", "findings"}:
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


def _load_prompt(name: str) -> str:
    # 【讀取 Prompt】原樣讀取規格檔，不做任何改寫。參數：name=檔名
    return (PROMPT_DIR / name).read_text(encoding="utf-8")


def render_user_prompt(payload: dict) -> str:
    # 【組使用者指令】只替換兩個佔位符，其餘文字不動。參數：payload=送出的資料
    text = _load_prompt(USER_PROMPT_FILE)
    text = text.replace("{{validated_payload_json}}", json.dumps(payload, ensure_ascii=False, indent=2))
    return text.replace("{{rules_version}}", RULES_VERSION)


def validate_sections(sections: list[dict], payload: dict) -> list[dict]:
    # 【檢查 AI 內容】schema 只管格式，這裡再確認內容對得上輸入；通過回傳原資料，不通過丟 AiOutputInvalid。
    # 參數：sections=AI 回傳的段落、payload=送出的資料
    fact_ids = {f["id"] for f in payload["facts"]}
    finding_ids = {f["id"] for f in payload["findings"]}
    # 1. 四段齊全且順序正確
    if [s["key"] for s in sections] != SECTION_KEYS:
        raise AiOutputInvalid("段落不是依序的四段")
    for s in sections:
        # 2. 內文不可空白或失控
        if not BODY_MIN <= len(s["body"].strip()) <= BODY_MAX:
            raise AiOutputInvalid(f"{s['key']} 內文字數需介於 {BODY_MIN} 至 {BODY_MAX} 字")
        # 3. 只能引用輸入中存在的事實與交叉分析
        if not set(s["fact_ids"]) <= fact_ids or not set(s["finding_ids"]) <= finding_ids:
            raise AiOutputInvalid(f"{s['key']} 引用了輸入中不存在的項目")
    # 4. 每個交叉分析至少被一段說明、四個核心指標至少被一段引用
    if not finding_ids <= {fid for s in sections for fid in s["finding_ids"]}:
        raise AiOutputInvalid("有交叉分析沒有被說明")
    if not set(CORE_FACT_IDS) <= {fid for s in sections for fid in s["fact_ids"]}:
        raise AiOutputInvalid("有核心指標沒有被引用")
    return sections


def _call_openai(user_prompt: str) -> list[dict]:
    # 【呼叫 OpenAI】送出一次請求並回傳解析後的段落；未設金鑰丟 AiNotConfigured，輸出不完整或拒答丟 AiOutputInvalid。
    # 參數：user_prompt=已組好的使用者指令
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise AiNotConfigured()
    # 1. 關掉套件自己的重試，統一由 generate_sections 控制次數與間隔
    client = OpenAI(api_key=api_key, timeout=_timeout_seconds(), max_retries=0)
    try:
        # 2. 固定的系統指令放 instructions、變動資料放 input，開頭相同的部分會被自動快取
        resp = client.responses.parse(
            model=os.getenv("OPENAI_MODEL", "gpt-6-luna"),
            instructions=_load_prompt(SYSTEM_PROMPT_FILE),
            input=user_prompt,
            text_format=ProfileOutput,
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
        log.info("風險屬性解析 token：輸入 %s（快取 %s）、輸出 %s", usage.input_tokens,
                 usage.input_tokens_details.cached_tokens, usage.output_tokens)
    return [s.model_dump() for s in resp.output_parsed.sections]


def generate_sections(payload: dict, call=_call_openai, sleep=time.sleep) -> list[dict]:
    # 【產生解析】呼叫 AI 並檢查內容；值得重試的失敗最多共呼叫 OPENAI_MAX_ATTEMPTS 次，間隔 2、5 秒。
    # 參數：payload=送出的資料、call=呼叫函式（測試時可替換）、sleep=等待函式（測試時可替換）
    user_prompt = render_user_prompt(payload)
    attempts = _max_attempts()
    for attempt in range(1, attempts + 1):
        try:
            return validate_sections(call(user_prompt), payload)
        except RETRYABLE_ERRORS as e:
            log.warning("風險屬性解析第 %d 次失敗：%s", attempt, e)
            if attempt == attempts:
                raise
            sleep(RETRY_WAIT_SECONDS[min(attempt - 1, len(RETRY_WAIT_SECONDS) - 1)])
    raise AiOutputInvalid("未取得輸出")  # attempts 設為 0 以下時才會到這裡


def save_sections(profile_id: int, sections: list[dict] | None, status: str) -> None:
    # 【寫入解析】唯一允許的更新：只有仍是 pending 的快照可以寫入一次解析與狀態。
    # 參數：profile_id=風險屬性編號、sections=四段解析（失敗時為空）、status=ready 或 failed
    with SessionLocal() as db:
        db.execute(
            update(RiskProfile)
            .where(RiskProfile.id == profile_id, RiskProfile.sections_status == "pending")
            .values(sections=sections, sections_status=status)
        )
        db.commit()


def _pending_key(profile_id: int) -> str:
    # 【產生中標記的鍵】參數：profile_id=風險屬性編號
    return f"sections_pending:{profile_id}"


def pending_ttl_seconds() -> int:
    # 【產生中標記有效秒數】所有嘗試都跑到逾時、加上重試間隔，再多 60 秒緩衝（預設 3×60+2+5+60=247 秒）。無參數。
    attempts = _max_attempts()
    return attempts * _timeout_seconds() + sum(RETRY_WAIT_SECONDS[:max(attempts - 1, 0)]) + 60


def mark_pending(profile_id: int) -> None:
    # 【登記「產生中」】開始產生時呼叫；標記過期仍是 pending，代表工作已中斷（例如後端重啟），讀取時會改判 failed。
    # 參數：profile_id=風險屬性編號
    redis_client.set(_pending_key(profile_id), 1, ex=pending_ttl_seconds())


def fail_if_stale(db, p: RiskProfile) -> None:
    # 【逾時判失敗】狀態是 pending 但「產生中」標記已過期，改成 failed 讓使用者能重新產生。
    # 參數：db=資料庫連線、p=風險屬性快照（會就地更新）
    if p.sections_status != "pending" or redis_client.exists(_pending_key(p.id)):
        return
    db.execute(
        update(RiskProfile)
        .where(RiskProfile.id == p.id, RiskProfile.sections_status == "pending")
        .values(sections_status="failed")
    )
    db.commit()
    db.refresh(p)


def reset_to_pending(profile_id: int) -> bool:
    # 【重新產生前置】只有 failed 的快照能改回 pending；成功回 True，狀態不符回 False。參數：profile_id=風險屬性編號
    with SessionLocal() as db:
        n = db.execute(
            update(RiskProfile)
            .where(RiskProfile.id == profile_id, RiskProfile.sections_status == "failed")
            .values(sections_status="pending")
        ).rowcount
        db.commit()
    return n == 1


def run_sections_job(profile_id: int) -> None:
    # 【背景工作：產生解析】回應送出後才執行：讀快照 → 組資料 → 呼叫 AI → 寫回；任何失敗都標為 failed，不影響四項核心指標。
    # 參數：profile_id=風險屬性編號
    try:
        # 1. 讀取快照並組資料
        with SessionLocal() as db:
            payload = build_payload(db.get(RiskProfile, profile_id))
        # 2. 產生並檢查解析
        sections = generate_sections(payload)
        # 3. 寫回
        save_sections(profile_id, sections, "ready")
    except AiNotConfigured:
        log.warning("未設定 OPENAI_API_KEY，風險屬性解析標為 failed")
        save_sections(profile_id, None, "failed")
    except Exception:  # 重試用盡、金鑰錯誤、請求錯誤等一律降級
        log.exception("風險屬性解析產生失敗")
        save_sections(profile_id, None, "failed")
