import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.security import require_n8n_key
from app.services.n8n_result import fail_error, ok_result
from app.services.stock_info import fetch_stock_info, save_stock_info

logger = logging.getLogger(__name__)

MESSAGE = "抓取上市櫃股票基本資料"  # 抓取訊息（只寫做什麼；成功或失敗由 status 顯示）

# 【股票基本資料 API】網址開頭皆為 /stocks
router = APIRouter(prefix="/stocks", tags=["股票基本資料"])


@router.post(
    "/fetch",
    summary="抓取上市櫃股票與 ETF 基本資料並存入資料庫（僅限 n8n，需標頭 X-API-Key）",
    dependencies=[Depends(require_n8n_key)],
)
def fetch(db: Session = Depends(get_db)):
    # 【抓取並儲存股票基本資料】從證交所取得代號、名稱、市場別、產業別（含大盤指數 IR0001），已存在的代號直接覆寫。僅 n8n 可呼叫。
    # 1. 抓取（每張表失敗會自動重試）；任何一張最終失敗就回 502，且不寫入任何資料
    try:
        rows = fetch_stock_info()
    except Exception as exc:
        logger.exception("fetch_stock_info failed")
        raise fail_error(502, MESSAGE, f"{type(exc).__name__}: {exc}"[:300]) from exc

    # 2. 寫入（同一次提交，失敗就復原）；只新增與覆寫，不刪除任何既有代號
    try:
        saved = save_stock_info(db, rows)
    except Exception as exc:
        logger.exception("save stock_info failed")
        raise fail_error(
            500, MESSAGE, "基本資料已抓取，但存入資料庫失敗", fail_count=len(rows)
        ) from exc

    # 3. 回傳統一的 n8n 欄位
    return ok_result(MESSAGE, success_count=saved, fail_count=0)
