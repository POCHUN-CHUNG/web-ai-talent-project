from fastapi import APIRouter, BackgroundTasks, Body, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, redis_client
from app.errors import ApiError
from app.models import QuestionnaireAnswer, RiskProfile, User
from app.security import current_user
from app.services.profile_ai import fail_if_stale, mark_pending, reset_to_pending, run_sections_job
from app.services.questionnaire import QUESTIONNAIRE_VERSION, QUESTIONS, compute_profile, find_conflicts, \
    validate_answers

# 【問卷與風險屬性 API】取得題目、送出作答、查詢風險屬性；全部需登入
router = APIRouter(tags=["問卷與風險屬性"])

SUBMIT_INTERVAL_SECONDS = 60  # 同一位使用者兩次送出問卷至少間隔的秒數（每次送出都會呼叫 AI，需控制成本）


def submit_cooldown_seconds(user_id: int) -> int:
    # 【剩餘冷卻秒數】距離可以再次送出問卷還要幾秒；0 代表現在就能填。參數：user_id=使用者編號
    ttl = redis_client.ttl(f"rate:questionnaire:{user_id}")  # 鎖不存在時 Redis 回 -2
    return max(int(ttl), 0)


def enforce_submit_limit(user_id: int, key: str = "questionnaire") -> None:
    # 【送出限流】每位使用者每分鐘只能成功送出一次問卷；超過回 429。
    # 參數：user_id=使用者編號、key=限流種類（questionnaire＝送出問卷、sections＝重新產生解析，各自獨立計時）
    # 1. 在 Redis 記一把 60 秒的鎖：設定成功代表這一分鐘內第一次送出；已存在代表太頻繁
    if not redis_client.set(f"rate:{key}:{user_id}", 1, nx=True, ex=SUBMIT_INTERVAL_SECONDS):
        raise ApiError(429, "RATE_LIMITED", "操作太頻繁，請於 1 分鐘後再試")


def serialize_profile(p: RiskProfile) -> dict:
    # 【風險屬性轉回應】前端只需要核心指標與四段解析。參數：p=風險屬性快照
    return {
        "id": p.id,
        "coreIndicators": {
            "lossTolerance": p.loss_tolerance,
            "investmentHorizon": p.investment_horizon,
            "liquidityNeed": p.liquidity_need,
            "financialCapacity": p.financial_capacity,
        },
        "sections": p.sections,
        "sectionsStatus": p.sections_status,
        "created": p.created.isoformat().replace("+00:00", "Z"),
    }


@router.get("/questionnaire", summary="取得 14 題題目與選項（需登入）")
def get_questionnaire(user: User = Depends(current_user)):
    # 【取得問卷】回傳題庫版本與 14 題題目、選項。參數：user=目前登入者（未登入回 401）
    return {"version": QUESTIONNAIRE_VERSION, "questions": QUESTIONS}


@router.get("/questionnaire/cooldown", summary="查詢還要等幾秒才能再次填寫問卷（需登入）")
def questionnaire_cooldown(user: User = Depends(current_user)):
    # 【填寫冷卻】前端在進入問卷頁前先問：剛送出過問卷時，需等滿 1 分鐘才能再填。參數：user=目前登入者
    return {"retryAfterSeconds": submit_cooldown_seconds(user.id)}


@router.post("/questionnaire/answers", status_code=201, summary="送出問卷作答並建立風險屬性快照（需登入）")
def submit_answers(
    background: BackgroundTasks,
    body: dict = Body(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    # 【送出問卷】驗證 → 衝突檢查 → 限流 → 轉換規則 → 作答與風險屬性同一交易寫入 → 背景請 AI 產生解析。
    # 未通過驗證或有衝突時不寫入任何資料，也不計入限流。參數：body={"answers": {...}}、user=目前登入者、db=資料庫連線
    # 1. 驗證 14 題（缺題、選項錯誤、Q11 規則不符皆回 400）
    try:
        answers = validate_answers(body.get("answers") if isinstance(body, dict) else None)
    except ValueError as e:
        raise ApiError(400, "INVALID_INPUT", str(e))
    # 2. 作答前後矛盾：回 422 並逐項帶出衝突（說明＋相關題號），前端據此標示每題與哪一題矛盾
    conflicts = find_conflicts(answers)
    if conflicts:
        raise ApiError(422, "ANSWER_CONFLICT", "\n".join(c["message"] for c in conflicts),
                       conflicts=[{"message": c["message"], "questionIds": c["question_ids"]} for c in conflicts])
    # 3. 每人每分鐘只能成功送出一次
    enforce_submit_limit(user.id)
    # 4. 依固定規則轉換，作答與風險屬性在同一交易寫入（每次重填都新增一組，舊的保留）
    result = compute_profile(answers)
    qa = QuestionnaireAnswer(user_id=user.id, answers=answers)
    db.add(qa)
    db.flush()
    profile = RiskProfile(
        user_id=user.id,
        questionnaire_answer_id=qa.id,
        loss_tolerance=result["coreIndicators"]["lossTolerance"],
        investment_horizon=result["coreIndicators"]["investmentHorizon"],
        liquidity_need=result["coreIndicators"]["liquidityNeed"],
        financial_capacity=result["coreIndicators"]["financialCapacity"],
        facts=result["facts"],
        findings=result["findings"],
        sections_status="pending",
    )
    db.add(profile)
    db.flush()
    mark_pending(profile.id)  # 登記「產生中」，供逾時判斷
    db.commit()
    # 5. 回應送出後才呼叫 AI，不讓使用者等待；失敗時解析標為 failed
    background.add_task(run_sections_job, profile.id)
    return {"riskProfileId": profile.id}


@router.post("/risk-profiles/{profile_id}/regenerate-sections", status_code=202,
             summary="重新產生風險屬性解析（僅限產生失敗者，每人每分鐘 1 次，需登入）")
def regenerate_sections(
    profile_id: int, background: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    # 【重新產生解析】AI 解析失敗時，讓使用者再要一次；解析已成功或仍在產生中則不動作。
    # 參數：profile_id=風險屬性編號、background=背景工作、user=目前登入者、db=資料庫連線
    # 1. 確認存在且屬於本人
    p = db.get(RiskProfile, profile_id)
    if p is None:
        raise ApiError(404, "NOT_FOUND", "找不到該風險屬性")
    if p.user_id != user.id:
        raise ApiError(403, "FORBIDDEN_RESOURCE", "無權存取他人的資源")
    # 2. 只有失敗狀態才需要重新產生；其他狀態直接回目前狀態
    if p.sections_status != "failed":
        return {"sectionsStatus": p.sections_status}
    # 3. 限流（每人每分鐘 1 次）→ 改回 pending → 背景重新呼叫 AI
    enforce_submit_limit(user.id, "sections")
    if reset_to_pending(p.id):
        mark_pending(p.id)
        background.add_task(run_sections_job, p.id)
    return {"sectionsStatus": "pending"}


@router.get("/risk-profiles/latest", summary="取得目前生效（最新）的風險屬性（需登入）")
def latest_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【最新風險屬性】從未填過問卷回 404。參數：user=目前登入者、db=資料庫連線
    p = db.scalar(
        select(RiskProfile).where(RiskProfile.user_id == user.id).order_by(RiskProfile.created.desc(), RiskProfile.id.desc())
    )
    if p is None:
        raise ApiError(404, "NOT_FOUND", "尚未填寫問卷")
    fail_if_stale(db, p)
    return serialize_profile(p)


@router.get("/risk-profiles/{profile_id}", summary="取得指定版本的風險屬性（需登入）")
def get_profile(profile_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【指定風險屬性】不存在回 404、屬於他人回 403。參數：profile_id=風險屬性編號、user=目前登入者、db=資料庫連線
    p = db.get(RiskProfile, profile_id)
    if p is None:
        raise ApiError(404, "NOT_FOUND", "找不到該風險屬性")
    if p.user_id != user.id:
        raise ApiError(403, "FORBIDDEN_RESOURCE", "無權存取他人的資源")
    fail_if_stale(db, p)
    return serialize_profile(p)
