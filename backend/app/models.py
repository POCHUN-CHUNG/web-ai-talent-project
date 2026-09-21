from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint
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


class StockInfo(Base):
    # 【股票基本資料表】每檔股票／ETF 一列，另收錄大盤指數 IR0001（市場別為「指數」）；只新增與更新，不刪除
    __tablename__ = "stock_info"

    symbol: Mapped[str] = mapped_column(String(10), primary_key=True)  # 代號（純代號，不含 .TW/.TWO 後綴）
    name: Mapped[str] = mapped_column(String(40))  # 有價證券名稱
    market: Mapped[str] = mapped_column(String(20))  # 市場別：上市、上櫃、指數
    industry: Mapped[str] = mapped_column(String(40))  # 產業別（ETF 為「ETF」、大盤指數為「大盤」）
    # 最後更新時間（UTC）
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    __table_args__ = (Index("idx_stock_info_name", "name"),)  # 依名稱搜尋用


class DailyQuote(Base):
    # 【日行情資料表】個股與大盤指數共用；同一代號同一天只有一列，重抓時直接覆寫。目前只存還原收盤價，之後可增加其他成交欄位
    __tablename__ = "daily_quotes"

    id: Mapped[int] = mapped_column(primary_key=True)  # 流水號（自動遞增）
    # 代號（必須已存在於股票基本資料表；有價格資料時不可刪除該股票）
    symbol: Mapped[str] = mapped_column(String(10), ForeignKey("stock_info.symbol", ondelete="RESTRICT"))
    # 還原除權息後的收盤價（大盤指數為報酬指數收盤值），必須大於 0
    adj_close: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    trade_date: Mapped[date] = mapped_column(Date)  # 交易日（台北時區的日期）
    __table_args__ = (
        UniqueConstraint("symbol", "trade_date", name="uq_daily_quotes"),  # 覆寫的依據：代號＋日期
        CheckConstraint("adj_close > 0", name="ck_daily_quotes_positive"),
    )
