import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routers import auth, bank_rates

# 【後端程式進入點】依序：建立應用程式 → 允許前端呼叫 → 建資料表 → 掛上各功能 API
app = FastAPI(title="診股整股-投資組合量化風險分析平台 API")

# 1. 只允許指定的前端網址呼叫本 API（網址由環境變數 FRONTEND_ORIGIN 設定）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5174")],
    allow_credentials=True,  # 允許帶登入通行證
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# 2. 資料表不存在時自動建立
Base.metadata.create_all(engine)

# 3. 掛上功能：登入註冊、銀行利率
app.include_router(auth.router)
app.include_router(bank_rates.router)


@app.get("/health", summary="健康檢查", tags=["系統"])
def health():
    # 【健康檢查】回傳 ok 代表後端正常運作，供監控系統使用
    return {"status": "ok"}
