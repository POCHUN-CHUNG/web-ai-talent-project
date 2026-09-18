from fastapi import FastAPI

app = FastAPI(title="診股整股-投資組合量化風險分析平台 API")


@app.get("/health")
def health():
    return {"status": "ok"}
