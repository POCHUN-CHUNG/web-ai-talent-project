import logging

from fastapi import APIRouter, HTTPException

from app.services.bank_rates import fetch_five_bank_rates

logger = logging.getLogger(__name__)

# 【銀行利率 API】網址開頭皆為 /bank-rates
router = APIRouter(prefix="/bank-rates", tags=["bank-rates"])


@router.post("/fetch", summary="抓取五大公股銀行 1 年期定存機動利率")
def fetch():
    # 【抓取利率】即時取得五大公股銀行的 1 年期定期存款機動利率。
    # 1. 呼叫爬取程式並回傳結果
    try:
        return fetch_five_bank_rates()
    except Exception as exc:
        # 2. 任一銀行抓取失敗，記錄錯誤並回 502（外部網站異常）
        logger.exception("fetch_five_bank_rates failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
