import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import Base, engine
from app.errors import ApiError, api_error_handler
from app.routers import auth, bank_rates, market_data, portfolios, questionnaire, stocks
from app.services.n8n_result import N8nError

# 【後端程式進入點】依序：建立應用程式 → 允許前端呼叫 → 建資料表 → 掛上各功能 API
app = FastAPI(title="診股整股-投資組合量化風險分析平台 API")

# 1. 只允許指定的前端網址呼叫本 API（網址由環境變數 FRONTEND_ORIGIN 設定）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5174")],
    allow_credentials=True,  # 允許帶登入通行證
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# 2. 資料表不存在時自動建立
Base.metadata.create_all(engine)

# 3. 掛上功能：登入註冊、問卷與風險屬性、投資組合、銀行利率、股票基本資料、每日股價
app.include_router(auth.router)
app.include_router(questionnaire.router)
app.include_router(portfolios.router)
app.include_router(bank_rates.router)
app.include_router(stocks.router)
app.include_router(market_data.router)


app.add_exception_handler(ApiError, api_error_handler)  # 前端 API 的統一失敗格式


@app.exception_handler(N8nError)
async def n8n_error_handler(request: Request, exc: N8nError):
    # 【n8n 失敗回應】把「只給 n8n 呼叫」端點的失敗，轉成與成功同一層的內容（不包 detail），搭配對應的 HTTP 狀態碼。
    # 參數：request=請求（未使用）、exc=失敗例外
    return JSONResponse(status_code=exc.status_code, content=exc.body)


@app.get("/health", summary="健康檢查", tags=["系統"])
def health():
    # 【健康檢查】回傳 ok 代表後端正常運作，供監控系統使用
    return {"status": "ok"}
