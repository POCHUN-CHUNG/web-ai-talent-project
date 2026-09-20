from datetime import datetime, timezone

from sqlalchemy import DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    # 【使用者資料表】每位註冊者一列
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)  # 使用者編號（自動遞增）
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # 帳號（不可重複，最長 32 字）
    password_hash: Mapped[str] = mapped_column(String(255))  # 加密後的密碼（不存明文）
    # 註冊時間（自動填入目前的 UTC 時間）
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class BankRate(Base):
    # 【銀行利率資料表】永遠只有 1 列，存最新一次抓到的五家銀行 1 年期定存機動利率（不保留舊資料）
    __tablename__ = "bank_rates"

    # 各銀行 1 年期定存機動利率（%，如 1.560）
    taiwan_bank: Mapped[float] = mapped_column(Numeric(5, 3))  # 臺灣銀行
    tcb_bank: Mapped[float] = mapped_column(Numeric(5, 3))  # 合作金庫銀行
    land_bank: Mapped[float] = mapped_column(Numeric(5, 3))  # 臺灣土地銀行
    huanan_bank: Mapped[float] = mapped_column(Numeric(5, 3))  # 華南銀行
    first_bank: Mapped[float] = mapped_column(Numeric(5, 3))  # 第一銀行
    # 最後更新時間（UTC）；表中只有 1 列，因此以它作為主鍵
    updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
