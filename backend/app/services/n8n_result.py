import time
from typing import Callable, TypeVar

T = TypeVar("T")

# 【n8n 回傳格式】所有「只給 n8n 呼叫」的端點共用同一種格式，n8n 可直接顯示（不回傳時間，時間由 n8n 自己取得）：
#   message       抓取訊息（固定寫「這次在做什麼」，例如「抓取五大公股銀行利率」；成敗看 status）
#   status        執行狀態，文字「成功」或「失敗」
#   success_count 成功筆數
#   fail_count    失敗筆數
#   error         失敗原因（僅失敗時出現，中文）
# 失敗時的欄位與成功時在「同一層」（不包 detail），n8n 用同一組運算式即可讀取；由 main.py 的例外處理轉成回應。


class N8nError(Exception):
    # 【n8n 失敗例外】帶著 HTTP 狀態碼與回傳內容，由 main.py 的例外處理直接轉成回應。
    def __init__(self, status_code: int, body: dict):
        super().__init__(body.get("error", ""))
        self.status_code = status_code  # HTTP 狀態碼
        self.body = body  # 回傳給 n8n 的內容


def ok_result(message: str, success_count: int, fail_count: int, **data) -> dict:
    # 【成功回傳】組出給 n8n 的成功內容。
    # 參數：message=抓取訊息、success_count=成功筆數、fail_count=失敗筆數、data=其他資料（如 rates）
    return {
        "message": message,
        "status": "成功",
        "success_count": success_count,
        "fail_count": fail_count,
        **data,
    }


def fail_error(
    status_code: int,
    message: str,
    error: str,
    success_count: int = 0,
    fail_count: int = 0,
    **data,
) -> N8nError:
    # 【失敗回傳】組出給 n8n 的失敗內容（HTTP 狀態碼讓 n8n 判斷成敗），呼叫端用 raise 丟出。
    # 參數：status_code=HTTP 狀態碼（502=外部來源失敗、500=自己出錯）、message=抓取訊息、
    #       error=失敗原因、success_count=成功筆數、fail_count=失敗筆數、data=其他資料
    return N8nError(
        status_code,
        {
            "message": message,
            "status": "失敗",
            "success_count": success_count,
            "fail_count": fail_count,
            "error": error,
            **data,
        },
    )


# ── 重試設定 ──
RETRY_ATTEMPTS = 3  # 每個動作最多試 3 次（第 1 次 + 重試 2 次）
RETRY_WAIT_SECONDS = (5, 20)  # 第 1 次失敗後等 5 秒、第 2 次失敗後等 20 秒（等久一點，讓被擋的來源冷卻）


def with_retry(action: Callable[[], T], label: str, logger, sleep=time.sleep) -> T:
    # 【失敗自動重試】執行 action；遇到錯誤（逾時、被擋、網頁回傳異常）就等一下再重抓，全部失敗才把最後的錯誤丟出去。
    # 參數：action=要執行的動作（無參數函式）、label=日誌用的名稱、logger=日誌物件、sleep=等待函式（測試時可替換）
    last_exc: Exception | None = None
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        # 1. 執行；成功就直接回傳
        try:
            return action()
        except Exception as exc:  # noqa: BLE001  來源失敗的型態很多，一律視為可重試
            last_exc = exc
            logger.warning("%s 第 %d/%d 次失敗：%s", label, attempt, RETRY_ATTEMPTS, exc)
            # 2. 還有下一次機會就先等待
            if attempt < RETRY_ATTEMPTS:
                sleep(RETRY_WAIT_SECONDS[min(attempt - 1, len(RETRY_WAIT_SECONDS) - 1)])
    # 3. 用完次數仍失敗
    assert last_exc is not None
    raise last_exc
