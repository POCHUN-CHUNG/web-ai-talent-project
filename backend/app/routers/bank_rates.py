import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import BankRate
from app.security import require_n8n_key
from app.services.bank_rates import fetch_five_bank_rates

logger = logging.getLogger(__name__)

# 銀行代號 → 中文名稱（回傳給 n8n 顯示用）
BANK_NAMES = {
    "taiwan_bank": "臺灣銀行",
    "tcb_bank": "合作金庫",
    "land_bank": "土地銀行",
    "huanan_bank": "華南銀行",
    "first_bank": "第一銀行",
}

# 【銀行利率 API】網址開頭皆為 /bank-rates
router = APIRouter(prefix="/bank-rates", tags=["銀行利率"])


@router.post(
    "/fetch",
    summary="抓取五大公股銀行 1 年期定存機動利率並存入資料庫（僅限 n8n，需標頭 X-API-Key）",
    dependencies=[Depends(require_n8n_key)],
)
def fetch(db: Session = Depends(get_db)):
    # 【抓取並儲存利率】取得五大公股銀行的 1 年期定期存款機動利率，存入資料庫後回傳。僅 n8n 可呼叫（金鑰驗證）。
    # 1. 呼叫爬取程式；任一銀行失敗就回 502，且不會寫入任何資料（五筆要嘛全存、要嘛全不存）
    try:
        rates = fetch_five_bank_rates()
    except Exception as exc:
        logger.exception("fetch_five_bank_rates failed")
        raise HTTPException(
            status_code=502, detail={"status": "失敗", "message": str(exc)}
        ) from exc

    # 2. 只保留最新資料：先清掉舊的那一列，再寫入新的一列（五家利率＋更新時間）
    # 3. 清舊與寫新在同一次提交；任何一步失敗就復原（舊資料保留）並回 500，讓 n8n 知道沒有存成功
    try:
        db.query(BankRate).delete()
        db.add(BankRate(**rates, updated=datetime.now(timezone.utc)))
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("save bank rates failed")
        raise HTTPException(
            status_code=500,
            detail={"status": "失敗", "message": "利率已抓取，但存入資料庫失敗"},
        ) from exc

    # 4. 回傳清單格式（含中文銀行名稱）與存檔狀態，方便 n8n 直接顯示
    return {
        "status": "成功",  # 執行狀態：成功或失敗（失敗時由下方錯誤回應帶「失敗」）
        "message": "已成功更新五大公股銀行利率",  # 給人看的狀態訊息
        "rates": [
            {"bank": bank, "name": BANK_NAMES.get(bank, bank), "rate": rate}
            for bank, rate in rates.items()
        ],
    }
