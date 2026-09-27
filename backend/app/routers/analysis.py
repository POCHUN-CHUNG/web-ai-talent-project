from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.security import current_user
from app.services.analysis import analysis_options, get_owned_analysis, history, run_analysis, serialize
from app.services.portfolio_data import get_owned_portfolio

# 【風險分析 API】分析前的選項、執行分析、查詢單次結果與歷史清單；全部需登入，且只能操作自己的組合與分析
router = APIRouter(tags=["風險分析"])


@router.get("/portfolios/{portfolio_id}/analysis/options", summary="取得分析前確認彈窗的預設值與可選範圍（需登入）")
def get_options(portfolio_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【分析選項】可分析的最大期間、利率選項、Q7／Q8／Q13 的預設值與選項。參數：portfolio_id=組合編號、user=目前登入者
    return analysis_options(db, user, get_owned_portfolio(db, user, portfolio_id))


@router.post("/portfolios/{portfolio_id}/analysis", status_code=201, summary="執行一次風險分析並存成唯讀快照（需登入）")
def create_analysis(portfolio_id: int, body: dict | None = Body(default=None), user: User = Depends(current_user),
                    db: Session = Depends(get_db)):
    # 【執行分析】參數皆可省略：期間預設採最大期間、利率預設 0%、Q7／Q8／Q13 預設為問卷作答。
    # 參數：portfolio_id=組合編號、body=lookbackYears／rateOption／profileInputs、user=目前登入者
    return serialize(run_analysis(db, user, get_owned_portfolio(db, user, portfolio_id), body))


@router.get("/portfolios/{portfolio_id}/analysis/history", summary="取得投資組合的歷史分析清單（需登入）")
def list_history(portfolio_id: int, page: int = 1, page_size: int = 20, user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    # 【歷史分析】由新到舊分頁，每筆含期間、利率選項與三項摘要指標。參數：portfolio_id=組合編號、page=頁碼、page_size=每頁筆數
    get_owned_portfolio(db, user, portfolio_id)
    return history(db, portfolio_id, page, page_size)


@router.get("/analysis/{analysis_id}", summary="取得一次分析的完整結果（需登入）")
def get_analysis(analysis_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # 【分析結果】回傳當時的唯讀快照。參數：analysis_id=分析編號、user=目前登入者
    return serialize(get_owned_analysis(db, user, analysis_id))
