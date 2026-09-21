import json
import logging
import os
import re
import time
from pathlib import Path

from jsonschema import Draft202012Validator
from sqlalchemy import update

from app.db import SessionLocal, redis_client
from app.models import QuestionnaireAnswer, RiskProfile

# 【風險屬性描述（AI）】把已算好的問卷結果交給 Gemini，產生一段客製化描述。
# 只解釋、不計算；Prompt 為規格檔（spec/prompts/），程式只讀取、不改寫（spec/03-contract.md §3.11）。
log = logging.getLogger("profile_ai")

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"  # 執行期 Prompt 純文字檔位置
SYSTEM_PROMPT_FILE = "01_profile_system.txt"  # 系統指令
USER_PROMPT_FILE = "01_profile_user.txt"  # 使用者指令模板
FINDING_IDS = ["primary_financial_constraints", "willingness_capacity_gap",
               "horizon_liquidity_consistency", "knowledge_experience_consistency"]  # 四個 finding 代號（固定順序）
DESCRIPTION_MIN, DESCRIPTION_MAX = 100, 260  # ready 時描述的合理字數範圍（B12）
BACKOFF_SECONDS = [1, 3]  # 第 1、2 次重試前的等待秒數
# 送入 AI 的欄位白名單：出現名單外的欄位即視為組裝錯誤（尤其不得含帳號、原始作答）
PAYLOAD_KEYS = {"schema_version", "rules_version", "snapshot_id", "confirmed", "readiness",
                "facts", "findings", "issues", "other_product_text"}
FORBIDDEN_KEYS = {"user_id", "username", "password", "answers", "q11_other", "q11Other"} | {f"q{i}" for i in range(1, 15)}

# AI 輸出格式（JSON Schema）：恰好這 7 個欄位，不得多也不得少
OUTPUT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["snapshot_id", "readiness", "profile_description", "evidence_ids",
                 "selected_finding_ids", "issue_ids", "next_step"],
    "properties": {
        "snapshot_id": {"type": "string"},
        "readiness": {"type": "string", "enum": ["ready", "limited", "blocked"]},
        "profile_description": {"type": "string", "minLength": 1},
        "evidence_ids": {"type": "array", "items": {"type": "string"}},
        "selected_finding_ids": {"type": "array", "items": {"type": "string"}},
        "issue_ids": {"type": "array", "items": {"type": "string"}},
        "next_step": {"type": "string"},
    },
}
_validator = Draft202012Validator(OUTPUT_SCHEMA)
# 給 Gemini 的版本：其 response_schema 不支援 additionalProperties，拿掉後仍由本程式的 _validator 嚴格檢查多餘欄位
GEMINI_SCHEMA = {k: v for k, v in OUTPUT_SCHEMA.items() if k != "additionalProperties"}


class AiNotConfigured(Exception):
    # 【未設定 AI 金鑰】.env 沒有 GEMINI_API_KEY 時丟出。
    pass


class AiOutputInvalid(Exception):
    # 【AI 輸出不合規】JSON 解析失敗、格式不符、引用不在白名單或照抄欄位不一致時丟出（會觸發重試）。
    pass


def _clean_text(text: str) -> str:
    # 【清洗文字】移除換行與控制字元，避免使用者自由文字夾帶指令排版。參數：text=原始文字
    return re.sub(r"[\x00-\x1f\x7f-\x9f\u2028\u2029]", "", text).strip()


def build_payload(profile: RiskProfile, other_text: str | None) -> dict:
    # 【組裝送給 AI 的資料】把快照轉成 Prompt 契約的 snake_case 格式；不含帳號與原始作答。
    # 參數：profile=風險屬性快照、other_text=Q11 選「其他」的自由文字（可為空）
    payload = {
        "schema_version": "1.0.0",
        "rules_version": "1.0.0",
        "snapshot_id": str(profile.id),
        "confirmed": True,  # 使用者按下送出即視為確認
        "readiness": profile.readiness,
        "facts": [{"id": f["id"], "label": f["label"], "value_text": f["valueText"],
                   "availability": f["availability"], "source_question_ids": f["sourceQuestionIds"],
                   "basis_fact_ids": f["basisFactIds"]} for f in profile.facts],
        "findings": [{"id": f["id"], "priority": f["priority"], "statement": f["statement"],
                      "fact_ids": f["factIds"]} for f in profile.findings],
        "issues": [{"id": i["id"], "kind": i["kind"], "description": i["description"],
                    "affected_fact_ids": i["affectedFactIds"]} for i in profile.issues],
    }
    if other_text:
        payload["other_product_text"] = _clean_text(other_text)[:100]  # 獨立欄位、上限 100 字
    assert_payload_allowed(payload)
    return payload


def assert_payload_allowed(payload: dict) -> None:
    # 【欄位白名單檢查】頂層只能有允許的欄位，且任何層級都不得出現禁止欄位，否則視為程式錯誤。參數：payload=要送出的資料
    if set(payload) - PAYLOAD_KEYS:
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
    # 【證據白名單】所有 available 的事實代號加上四個 finding 代號，去重並依固定順序排列。參數：payload=送出的資料
    facts = [f["id"] for f in payload["facts"] if f["availability"] == "available"]
    return list(dict.fromkeys(facts + FINDING_IDS))


def _load_prompt(name: str) -> str:
    # 【讀取 Prompt】原樣讀取規格檔，不做任何改寫。參數：name=檔名
    return (PROMPT_DIR / name).read_text(encoding="utf-8")


def render_user_prompt(payload: dict, refs: list[str]) -> str:
    # 【組使用者指令】只把兩個佔位符換成 JSON，其餘文字不動。參數：payload=送出的資料、refs=證據白名單
    text = _load_prompt(USER_PROMPT_FILE)
    text = text.replace("{{validated_payload_json}}", json.dumps(payload, ensure_ascii=False, indent=2))
    return text.replace("{{available_evidence_refs_json}}", json.dumps(refs, ensure_ascii=False))


def parse_output(raw: str) -> dict:
    # 【解析 AI 輸出】先直接解析；失敗再剝除 ```json 圍欄重試一次；仍失敗丟 AiOutputInvalid。參數：raw=模型原始文字
    for candidate in (raw, re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", raw or "")):
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except (json.JSONDecodeError, TypeError):
            continue
    raise AiOutputInvalid("輸出不是合法的 JSON 物件")


def validate_output(data: dict, payload: dict, refs: list[str]) -> str:
    # 【驗證 AI 輸出】檢查格式、照抄欄位、引用白名單，通過則回傳描述文字；不通過丟 AiOutputInvalid。
    # 參數：data=解析後的輸出、payload=送出的資料、refs=證據白名單
    errors = list(_validator.iter_errors(data))
    if errors:
        raise AiOutputInvalid(f"格式不符：{errors[0].message}")
    if data["snapshot_id"] != payload["snapshot_id"] or data["readiness"] != payload["readiness"]:
        raise AiOutputInvalid("照抄欄位（snapshot_id、readiness）與輸入不一致")
    if data["issue_ids"] != [i["id"] for i in payload["issues"]]:
        raise AiOutputInvalid("issue_ids 未照抄輸入")
    if not set(data["evidence_ids"]) <= set(refs):
        raise AiOutputInvalid("evidence_ids 含有白名單以外的項目")
    if not set(data["selected_finding_ids"]) <= set(FINDING_IDS):
        raise AiOutputInvalid("selected_finding_ids 含有白名單以外的項目")
    text = data["profile_description"].strip()
    if payload["readiness"] == "ready" and not DESCRIPTION_MIN <= len(text) <= DESCRIPTION_MAX:
        raise AiOutputInvalid(f"描述字數需介於 {DESCRIPTION_MIN} 至 {DESCRIPTION_MAX} 字")
    return text


def _call_gemini(user_prompt: str) -> str:
    # 【呼叫 Gemini】送出一次請求並回傳文字；未設金鑰丟 AiNotConfigured。參數：user_prompt=已組好的使用者指令
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise AiNotConfigured()
    from google import genai  # 延後匯入：沒用到 AI 時不影響後端啟動
    from google.genai import types

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=int(os.getenv("GEMINI_TIMEOUT_SECONDS", "180")) * 1000),  # 毫秒
    )
    resp = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=_load_prompt(SYSTEM_PROMPT_FILE),
            temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.2")),
            max_output_tokens=int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "65536")),
            response_mime_type="application/json",
            response_schema=GEMINI_SCHEMA,
        ),
    )
    return resp.text or ""


def generate_description(payload: dict, call=_call_gemini, sleep=time.sleep) -> str:
    # 【產生描述】呼叫 AI 並驗證；只在輸出不合規時重試（最多 GEMINI_MAX_RETRIES 次，等 1、3 秒），連線類錯誤不重試。
    # 參數：payload=送出的資料、call=呼叫函式（測試時可替換）、sleep=等待函式（測試時可替換）
    refs = evidence_refs(payload)
    user_prompt = render_user_prompt(payload, refs)
    retries = int(os.getenv("GEMINI_MAX_RETRIES", "2"))
    for attempt in range(retries + 1):
        try:
            return validate_output(parse_output(call(user_prompt)), payload, refs)
        except AiOutputInvalid as e:
            log.warning("風險屬性描述第 %d 次輸出不合規：%s", attempt + 1, e)
            if attempt == retries:
                raise
            sleep(BACKOFF_SECONDS[min(attempt, len(BACKOFF_SECONDS) - 1)])
    raise AiOutputInvalid("未取得輸出")  # 理論上不會到這裡


def set_description(profile_id: int, description: str | None, status: str) -> None:
    # 【寫入描述】唯一允許的更新：只有仍是 pending 的快照可以寫入一次描述與狀態。
    # 參數：profile_id=風險屬性編號、description=描述（失敗時為空）、status=ready 或 failed
    with SessionLocal() as db:
        db.execute(
            update(RiskProfile)
            .where(RiskProfile.id == profile_id, RiskProfile.description_status == "pending")
            .values(description=description, description_status=status)
        )
        db.commit()


def _pending_key(profile_id: int) -> str:
    # 【產生中標記的鍵】參數：profile_id=風險屬性編號
    return f"description_pending:{profile_id}"


def mark_pending(profile_id: int) -> None:
    # 【登記「產生中」】開始產生描述時呼叫；標記有效「GEMINI_TIMEOUT_SECONDS + 60 秒」（預設 240 秒），
    # 過期仍是 pending 就代表工作已中斷（例如後端重啟），讀取時會改判為 failed。參數：profile_id=風險屬性編號
    ttl = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "180")) + 60
    redis_client.set(_pending_key(profile_id), 1, ex=ttl)


def fail_if_stale(db, p: RiskProfile) -> None:
    # 【逾時判失敗】狀態是 pending 但「產生中」標記已過期，表示背景工作不會再回來（後端重啟等），改成 failed 讓使用者能重新產生。
    # 參數：db=資料庫連線、p=風險屬性快照（會就地更新）
    if p.description_status != "pending" or redis_client.exists(_pending_key(p.id)):
        return
    db.execute(
        update(RiskProfile)
        .where(RiskProfile.id == p.id, RiskProfile.description_status == "pending")
        .values(description_status="failed")
    )
    db.commit()
    db.refresh(p)


def reset_to_pending(profile_id: int) -> bool:
    # 【重新產生前置】只有狀態為 failed 的快照才能改回 pending（允許重新產生）；成功回 True，狀態不符回 False。
    # 參數：profile_id=風險屬性編號
    with SessionLocal() as db:
        n = db.execute(
            update(RiskProfile)
            .where(RiskProfile.id == profile_id, RiskProfile.description_status == "failed")
            .values(description_status="pending")
        ).rowcount
        db.commit()
    return n == 1


def run_description_job(profile_id: int) -> None:
    # 【背景工作：產生描述】回應送出後才執行：讀快照與作答 → 組資料 → 呼叫 AI → 寫回結果；任何失敗都標為 failed，不影響四項核心指標。
    # 參數：profile_id=風險屬性編號
    try:
        # 1. 讀取快照與作答的自由文字
        with SessionLocal() as db:
            profile = db.get(RiskProfile, profile_id)
            other = db.get(QuestionnaireAnswer, profile.questionnaire_answer_id).answers.get("q11_other")
            payload = build_payload(profile, other)
        # 2. 產生並驗證描述
        text = generate_description(payload)
        # 3. 寫回
        set_description(profile_id, text, "ready")
    except AiNotConfigured:
        log.warning("未設定 GEMINI_API_KEY，風險屬性描述標為 failed")
        set_description(profile_id, None, "failed")
    except Exception:  # 逾時、HTTP 錯誤、輸出連續不合規等一律降級
        log.exception("風險屬性描述產生失敗")
        set_description(profile_id, None, "failed")
