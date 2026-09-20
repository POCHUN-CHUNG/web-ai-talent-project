from datetime import datetime, timezone

from sqlalchemy import DateTime, String
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
