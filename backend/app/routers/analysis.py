from fastapi import APIRouter, BackgroundTasks, Body, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.routers.questionnaire import enforce_submit_limit
from app.security import current_user
from app.services.analysis import analysis_options, get_owned_analysis, history, profile_choices, run_analysis, serialize
from app.services.analysis_ai import clear_pending, create_pending, fail_if_stale, get_report, mark_pending, \
    reset_to_pending, run_report_job, serialize_report
from app.services.portfolio_data import get_owned_portfolio

# 【風險分析 API】分析前的選項、執行分析、查詢與刪除單次結果、AI 報告與歷史清單；全部需登入，且只能操作自己的組合與分析
router = APIRouter(tags=["風險分析"])


@router.get("/risk-profiles/latest/analysis-inputs", summary="取得風險分析可調整的 Q7／Q8／Q13 預設值與選項，不需指定投資組合（需登入）")
def get_profile_choices(user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【風險屬性可調整欄位】只依賴使用者的最新風險屬性，選投資組合前就能顯示。參數：user=目前登入者
    return profile_choices(db, user)


@router.get("/portfolios/{portfolio_id}/analysis/options", summary="取得分析前確認彈窗的預設值與可選範圍（需登入）")
def get_options(portfolio_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【分析選項】可分析的最大期間、利率選項、Q7／Q8／Q13 的預設值與選項。參數：portfolio_id=組合編號、user=目前登入者
    return analysis_options(db, user, get_owned_portfolio(db, user, portfolio_id))


@router.post("/portfolios/{portfolio_id}/analysis", status_code=201,
             summary="執行一次風險分析並存成唯讀快照，AI 報告在背景產生（需登入）")
def create_analysis(portfolio_id: int, background: BackgroundTasks, body: dict | None = Body(default=None),
                    user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【執行分析】參數皆可省略：期間預設採最大期間、利率預設 0%、Q7／Q8／Q13 預設為問卷作答。
    # 參數：portfolio_id=組合編號、background=背景工作、body=lookback_years／rate_option／profile_inputs、user=目前登入者
    # 1. 計算並寫入快照
    row = run_analysis(db, user, get_owned_portfolio(db, user, portfolio_id), body)
    # 2. 建立待產生的報告；回應送出後才呼叫 AI，不讓使用者等待
    report = create_pending(db, row.id)
    background.add_task(run_report_job, row.id)
    return serialize(row, report.status)


@router.get("/analysis/history", summary="取得自己的歷史分析清單，可指定投資組合（需登入）")
def list_history(portfolio_id: int | None = None, page: int = 1, page_size: int = 20,
                 user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【歷史分析】由新到舊分頁，每筆含組合名稱、分析條件、三項摘要指標與報告狀態。
    # 參數：portfolio_id=只看這個組合（省略＝全部）、page=頁碼、page_size=每頁筆數、user=目前登入者
    if portfolio_id is not None:
        get_owned_portfolio(db, user, portfolio_id)
    return history(db, user, portfolio_id, page, page_size)


@router.get("/analysis/{analysis_id}", summary="取得一次分析的完整結果（需登入）")
def get_analysis(analysis_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【分析結果】回傳當時的唯讀快照與報告狀態。參數：analysis_id=分析編號、user=目前登入者
    row = get_owned_analysis(db, user, analysis_id)
    report = get_report(db, row.id)
    if report:
        fail_if_stale(db, report)
    return serialize(row, report.status if report else None)


@router.delete("/analysis/{analysis_id}", status_code=204, summary="刪除一次分析與其 AI 報告（需登入）")
def delete_analysis(analysis_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【刪除分析】連同 AI 報告一併刪除（資料庫層級串聯刪除）；報告若仍在背景產生，寫回時找不到資料會自動略過。
    # 參數：analysis_id=分析編號、user=目前登入者
    row = get_owned_analysis(db, user, analysis_id)
    db.delete(row)
    db.commit()
    clear_pending(analysis_id)


@router.get("/analysis/{analysis_id}/report", summary="取得一次分析的 AI 風險分析報告與產生狀態（需登入）")
def get_analysis_report(analysis_id: int, background: BackgroundTasks, user: User = Depends(current_user),
                        db: Session = Depends(get_db)):
    # 【分析報告】pending 時前端每隔幾秒再查一次；ready 時附上內容；failed 時由前端顯示「重新產生」。
    # 功能上線前建立的舊分析沒有報告，第一次查詢時才開始產生。參數：analysis_id=分析編號、background=背景工作、user=目前登入者
    row = get_owned_analysis(db, user, analysis_id)
    report = get_report(db, row.id)
    if report is None:
        report = create_pending(db, row.id)
        background.add_task(run_report_job, row.id)
    else:
        fail_if_stale(db, report)
    return serialize_report(report, row.id)


@router.post("/analysis/{analysis_id}/report/regenerate", status_code=202,
             summary="重新產生 AI 風險分析報告（僅限產生失敗者，每人每分鐘 1 次，需登入）")
def regenerate_report(analysis_id: int, background: BackgroundTasks, user: User = Depends(current_user),
                      db: Session = Depends(get_db)):
    # 【重新產生報告】報告產生失敗時，讓使用者再要一次；已成功或仍在產生中則不動作，直接回目前狀態。
    # 參數：analysis_id=分析編號、background=背景工作、user=目前登入者
    # 1. 確認分析存在且屬於本人
    row = get_owned_analysis(db, user, analysis_id)
    report = get_report(db, row.id)
    if report is not None:
        fail_if_stale(db, report)
    # 2. 只有失敗狀態才需要重新產生（沒有報告的舊分析由查詢報告時自動產生）
    if report is None or report.status != "failed":
        return serialize_report(report, row.id)
    # 3. 限流（每人每分鐘 1 次）→ 先登記產生中（避免改回 pending 的瞬間被判逾時）→ 改回 pending → 背景重新呼叫 AI
    enforce_submit_limit(user.id, "report")
    mark_pending(row.id)
    if reset_to_pending(row.id):
        background.add_task(run_report_job, row.id)
    db.refresh(report)
    return serialize_report(report, row.id)
