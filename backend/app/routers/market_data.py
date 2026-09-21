import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db, redis_client
from app.security import require_n8n_key
from app.services.market_data import FAILED_LIST_LIMIT, run_daily_fetch
from app.services.n8n_result import fail_error, ok_result

logger = logging.getLogger(__name__)

MESSAGE = "抓取上市櫃股票日行情資料"  # 抓取訊息（只寫做什麼；成功或失敗由 status 顯示）
LOCK_KEY = "lock:market_data_fetch"  # 防止同時跑兩次的鎖
LOCK_TTL = 3 * 3600  # 鎖最長保留 3 小時（程式異常中止時自動解除）

# 【市場資料 API】網址開頭皆為 /market-data
router = APIRouter(prefix="/market-data", tags=["市場資料"])


@router.post(
    "/fetch",
    summary="抓取所有股票每日收盤價與大盤指數並存入資料庫（僅限 n8n，需標頭 X-API-Key）",
    dependencies=[Depends(require_n8n_key)],
)
def fetch(db: Session = Depends(get_db)):
    # 【抓取每日股價】依股票基本資料建立清單，抓取個股收盤價與大盤指數，同一代號同一天已有資料則直接覆寫。僅 n8n 可呼叫。
    # 起訖日期由後端自行決定（首次抓 10 年，之後只抓近 1 個月），n8n 不需傳參數。無參數。
    # 1. 已有一次在執行就拒絕（n8n 逾時重試時不會疊出兩份同時狂抓，造成被擋）
    if not redis_client.set(LOCK_KEY, "1", nx=True, ex=LOCK_TTL):
        raise fail_error(409, MESSAGE, "上一次抓取仍在執行中，請稍後再試")

    try:
        # 2. 執行抓取（內部逐批寫入資料庫，中途失敗的部分下次會整段補回）
        try:
            report = run_daily_fetch(db)
        except Exception as exc:
            logger.exception("run_daily_fetch failed")
            raise fail_error(
                500, MESSAGE, f"{type(exc).__name__}: {exc}"[:300]
            ) from exc
    finally:
        # 3. 一定要解除鎖
        redis_client.delete(LOCK_KEY)

    # 4. 依結果回傳：清單是空的代表股票基本資料尚未建立
    data = {
        "stock_success_count": report.stock_success,  # 個股成功筆數
        "index_success_count": report.index_success,  # 大盤指數成功筆數（0 或 1）
        "rows_written": report.rows_written,  # 實際寫入（新增或覆寫）的資料列數
        "deleted_count": report.deleted,  # 清除的過期資料列數
        "restated": report.restated,  # 因除權息還原基準改變而整檔重抓的代號
        "abnormal": report.abnormal,  # 近 14 天單日漲跌幅超過 11% 的紀錄（僅提醒）
        "failed": report.failed[
            :FAILED_LIST_LIMIT
        ],  # 失敗的代號與原因（最多列 100 項）
        "no_data_count": len(
            report.no_data
        ),  # 查無資料的代號數（Yahoo 沒有該檔價格，不算失敗）
        "no_data": report.no_data[
            :FAILED_LIST_LIMIT
        ],  # 查無資料的代號（最多列 100 項）
    }
    if report.success_count == 0 and report.fail_count == 0 and not report.no_data:
        raise fail_error(
            422, MESSAGE, "股票基本資料是空的，請先執行抓取股票基本資料", **data
        )
    if report.fail_count:
        # 部分失敗：成功的已寫入並保留；回 502 讓 n8n 判定失敗並重試（重跑會整段補回失敗的部分）
        raise fail_error(
            502,
            MESSAGE,
            f"有 {report.fail_count} 筆抓取失敗（成功的資料已寫入）",
            success_count=report.success_count,
            fail_count=report.fail_count,
            **data,
        )
    return ok_result(MESSAGE, success_count=report.success_count, fail_count=0, **data)
