import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routers import auth, bank_rates

app = FastAPI(title="診股整股-投資組合量化風險分析平台 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5174")],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

Base.metadata.create_all(engine)

app.include_router(auth.router)
app.include_router(bank_rates.router)


@app.get("/health")
def health():
    return {"status": "ok"}
