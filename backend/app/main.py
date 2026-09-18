from fastapi import FastAPI

from app.routers import bank_rates

app = FastAPI(title="診股整股-投資組合量化風險分析平台 API")

app.include_router(bank_rates.router)


@app.get("/health")
def health():
    return {"status": "ok"}
