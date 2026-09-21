import uuid

from fastapi import Request
from fastapi.responses import JSONResponse

# 【前端錯誤格式】給前端呼叫的 API 統一的失敗回應：{"detail": {"code", "message", "trace_id"}}（spec/03-contract.md §3.3）


class ApiError(Exception):
    # 【API 錯誤】需要回報給前端的失敗。
    # 參數：status_code=HTTP 狀態碼、code=錯誤碼（如 INVALID_INPUT）、message=中文說明
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


async def api_error_handler(request: Request, exc: ApiError):
    # 【錯誤轉回應】把 ApiError 轉成統一格式，並附上追蹤編號供日後對照日誌。參數：request=請求（未使用）、exc=錯誤
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": {"code": exc.code, "message": exc.message, "trace_id": str(uuid.uuid4())}},
    )
