from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    # 【使用者資料表】每位註冊者一列
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)  # 使用者編號（自動遞增）
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # 帳號（不可重複，最長 32 字）
    password: Mapped[str] = mapped_column(String(255))  # 加密後的密碼（不存明文）
    # 註冊時間（自動填入目前的 UTC 時間）
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # 密碼更新時間（尚未改過密碼時為 None，改密碼時才填入目前的 UTC 時間）
    password_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BankRate(Base):
    # 【銀行利率資料表】每家銀行 1 年期定存機動利率各一列，只保留每家最新一次抓到的值，不留歷史
    __tablename__ = "bank_rates"

    bank: Mapped[str] = mapped_column(String(20), primary_key=True)  # 銀行代號，如 taiwan_bank、tcb_bank、land_bank、huanan_bank、first_bank
    rate: Mapped[float] = mapped_column(Numeric(5, 3))  # 1 年期定存機動利率（%，如 1.560）
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )  # 最後更新時間（UTC）


class StockInfo(Base):
    # 【股票基本資料表】每檔股票／ETF 一列，另收錄大盤指數 IR0001（市場別為「指數」）；只新增與更新，不刪除
    __tablename__ = "stock_info"

    symbol: Mapped[str] = mapped_column(String(10), primary_key=True)  # 代號（純代號，不含 .TW/.TWO 後綴）
    name: Mapped[str] = mapped_column(String(40))  # 有價證券名稱
    market: Mapped[str] = mapped_column(String(20))  # 市場別：上市、上櫃、指數
    industry: Mapped[str] = mapped_column(String(40))  # 產業別（ETF 為「ETF」、大盤指數為「大盤」）
    # 第一次寫入這檔資料的時間（UTC）；之後覆寫不會再變動
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # 名稱、市場別或產業別有異動時的時間（UTC）；抓到的內容跟資料庫一樣則不更新
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    __table_args__ = (Index("idx_stock_info_name", "name"),)  # 依名稱搜尋用


class DailyQuote(Base):
    # 【日行情資料表】個股與大盤指數共用；同一代號同一天只有一列，重抓時直接覆寫，永遠不刪除。目前只存還原收盤價，之後可增加其他成交欄位
    __tablename__ = "daily_quotes"

    id: Mapped[int] = mapped_column(primary_key=True)  # 流水號（自動遞增）
    # 代號（必須已存在於股票基本資料表；有價格資料時不可刪除該股票）
    symbol: Mapped[str] = mapped_column(String(10), ForeignKey("stock_info.symbol", ondelete="RESTRICT"))
    # 還原除權息後的收盤價（大盤指數為報酬指數收盤值），必須大於 0
    adj_close: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    trade_date: Mapped[date] = mapped_column(Date)  # 交易日（台北時區的日期）
    # 這一列最後一次抓取／覆寫的時間（台北時區）
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    __table_args__ = (
        UniqueConstraint("symbol", "trade_date", name="uq_daily_quotes"),  # 覆寫的依據：代號＋日期
        CheckConstraint("adj_close > 0", name="ck_daily_quotes_positive"),
    )


def _utc_now() -> datetime:
    # 【現在時間】回傳目前的 UTC 時間，作為建立時間的預設值。無參數。
    return datetime.now(timezone.utc)


class QuestionnaireAnswer(Base):
    # 【問卷作答資料表】每次成功送出問卷存一列（已通過驗證與衝突檢查），唯讀快照：只新增與查詢，不修改、不刪除
    __tablename__ = "questionnaire_answers"

    id: Mapped[int] = mapped_column(primary_key=True)  # 作答編號（自動遞增）
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))  # 作答的使用者（刪帳號時一併清除）
    answers: Mapped[dict] = mapped_column(JSONB)  # 14 題作答（選項代號），如 {"q1":"B",...,"q11":["B","C"],"q11_other":null}
    created: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)  # 送出時間（UTC）
    __table_args__ = (Index("idx_qa_user_created", "user_id", "created"),)


class RiskProfile(Base):
    # 【風險屬性資料表】問卷轉換後的結果快照，唯讀：只新增與查詢；唯一例外是 AI 解析回來後可更新一次解析與狀態
    __tablename__ = "risk_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)  # 風險屬性編號（自動遞增）
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))  # 所屬使用者
    questionnaire_answer_id: Mapped[int] = mapped_column(
        ForeignKey("questionnaire_answers.id", ondelete="CASCADE")
    )  # 對應的作答
    loss_tolerance: Mapped[str] = mapped_column(String(20))  # 核心指標：可接受損失區間（Q13 選項原文）
    investment_horizon: Mapped[str] = mapped_column(String(20))  # 核心指標：投資期限（Q7 選項原文）
    liquidity_need: Mapped[str] = mapped_column(String(10))  # 核心指標：資金流動性需求
    financial_capacity: Mapped[str] = mapped_column(String(10))  # 核心指標：財務風險承受能力
    facts: Mapped[list] = mapped_column(JSONB)  # 事實清單（17 項），格式即送給 AI 的格式
    findings: Mapped[list] = mapped_column(JSONB)  # 交叉分析結果（5 項），格式即送給 AI 的格式
    sections: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # AI 產生的四段風險屬性解析（成功前為空）
    sections_status: Mapped[str] = mapped_column(String(10), default="pending")  # 解析狀態：pending／ready／failed
    created: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)  # 建立時間（UTC）
    __table_args__ = (
        CheckConstraint("sections_status IN ('pending','ready','failed')", name="ck_rp_sections_status"),
        Index("idx_rp_user_created", "user_id", "created"),
    )


class Portfolio(Base):
    # 【投資組合資料表】使用者建立的一組持股集合；同一使用者不可有同名組合
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(primary_key=True)  # 組合編號（自動遞增）
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))  # 所屬使用者（刪帳號時一併清除）
    name: Mapped[str] = mapped_column(String(30))  # 組合名稱（1～30 字）
    created: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)  # 建立時間（UTC）
    updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now)  # 最後更新時間（UTC）
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_portfolio_name"),  # 同一使用者不可重複命名
        Index("idx_portfolios_user", "user_id"),
    )


class HoldingLot(Base):
    # 【買進紀錄資料表】一次買進一列；同一檔、同一天可有多筆（不設唯一限制）。不支援賣出，減碼請直接修改或刪除該筆
    __tablename__ = "holding_lots"

    id: Mapped[int] = mapped_column(primary_key=True)  # 買進紀錄編號（自動遞增）
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id", ondelete="CASCADE"))  # 所屬組合（刪組合時一併清除）
    # 股票代號（股票下市時不可悄悄刪掉使用者的紀錄，故不允許刪除仍被引用的股票）
    symbol: Mapped[str] = mapped_column(String(10), ForeignKey("stock_info.symbol", ondelete="RESTRICT"))
    trade_date: Mapped[date] = mapped_column(Date)  # 買進日期
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4))  # 股數（支援零股），必須大於 0
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 4))  # 每股價格，必須大於 0
    created: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)  # 建立時間（UTC）
    updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now)  # 最後更新時間（UTC）
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_holding_lots_quantity"),
        CheckConstraint("unit_cost > 0", name="ck_holding_lots_unit_cost"),
        Index("idx_holding_lots_pf_symbol", "portfolio_id", "symbol", "trade_date"),
    )
