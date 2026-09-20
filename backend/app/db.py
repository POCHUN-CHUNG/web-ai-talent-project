import os

import redis
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# 資料庫連線（網址從環境變數 DATABASE_URL 讀取；pool_pre_ping=使用前先確認連線仍可用）
engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
# 資料庫「對話」產生器，每次請求開一個新對話
SessionLocal = sessionmaker(bind=engine, autoflush=False)

# Redis（記憶庫）連線，用來存登入通行證（網址從環境變數 REDIS_URL 讀取）
redis_client = redis.Redis.from_url(os.environ["REDIS_URL"], decode_responses=True)


class Base(DeclarativeBase):
    # 【資料表基底】所有資料表定義都繼承它
    pass


def get_db():
    # 【取得資料庫連線】每個請求使用一次，由系統自動呼叫。
    # 1. 開啟連線並交給請求使用
    db = SessionLocal()
    try:
        yield db
    finally:
        # 2. 請求結束後一定關閉連線
        db.close()
