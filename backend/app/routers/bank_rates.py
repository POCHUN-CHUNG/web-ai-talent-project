import logging

from fastapi import APIRouter, HTTPException

from app.services.bank_rates import fetch_five_bank_rates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bank-rates", tags=["bank-rates"])


@router.post("/fetch")
def fetch():
    """抓取五大公股銀行的 1 年期定期存款機動利率"""
    try:
        return fetch_five_bank_rates()
    except Exception as exc:
        logger.exception("fetch_five_bank_rates failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
