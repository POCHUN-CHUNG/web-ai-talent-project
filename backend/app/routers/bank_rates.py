import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import BankRate
from app.security import require_n8n_key
from app.services.bank_rates import fetch_five_bank_rates
from app.services.n8n_result import fail_error, ok_result

logger = logging.getLogger(__name__)

# 銀行代號 → 中文名稱（回傳給 n8n 顯示用）
BANK_NAMES = {
    "taiwan_bank": "臺灣銀行",
    "tcb_bank": "合作金庫",
    "land_bank": "土地銀行",
    "huanan_bank": "華南銀行",
    "first_bank": "第一銀行",
}
MESSAGE = "抓取五大公股銀行利率"  # 抓取訊息（只寫做什麼；成功或失敗由 status 顯示）

# 【銀行利率 API】網址開頭皆為 /bank-rates
router = APIRouter(prefix="/bank-rates", tags=["銀行利率"])


@router.post(
    "/fetch",
    summary="抓取五大公股銀行 1 年期定存機動利率並存入資料庫（僅限 n8n，需標頭 X-API-Key）",
    dependencies=[Depends(require_n8n_key)],
)
def fetch(db: Session = Depends(get_db)):
    # 【抓取並儲存利率】取得五大公股銀行的 1 年期定期存款機動利率，存入資料庫後回傳。僅 n8n 可呼叫（金鑰驗證）。
    # 1. 呼叫爬取程式（每家失敗會自動重試）；任一家最終失敗就回 502，且不會寫入任何資料（五筆要嘛全存、要嘛全不存，舊值保留）
    rates, errors = fetch_five_bank_rates()
    if errors:
        detail = "；".join(f"{BANK_NAMES.get(b, b)}：{e}" for b, e in errors.items())
        logger.error("bank rates failed: %s", detail)
        raise fail_error(502, MESSAGE, detail, success_count=len(rates), fail_count=len(errors))

    # 2. 覆寫：以銀行代號為依據逐家 upsert（沒有就新增、已有就覆寫利率與更新時間），每家只保留最新一列
    # 3. 五家一起提交；任何一步失敗就復原（舊資料保留）並回 500，讓 n8n 知道沒有存成功
    try:
        now = datetime.now(timezone.utc)
        stmt = insert(BankRate).values(
            [{"bank": bank, "rate": rate, "updated": now} for bank, rate in rates.items()]
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["bank"], set_={"rate": stmt.excluded.rate, "updated": stmt.excluded.updated}
        )
        db.execute(stmt)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("save bank rates failed")
        raise fail_error(500, "銀行利率存入資料庫", "利率已抓取，但存入資料庫失敗", success_count=0, fail_count=len(rates)) from exc

    # 4. 回傳清單格式（含中文銀行名稱）與統一的 n8n 欄位，方便 n8n 直接顯示
    return ok_result(
        MESSAGE,
        success_count=len(rates),
        fail_count=0,
        rates=[{"bank": bank, "name": BANK_NAMES.get(bank, bank), "rate": rate} for bank, rate in rates.items()],
    )
