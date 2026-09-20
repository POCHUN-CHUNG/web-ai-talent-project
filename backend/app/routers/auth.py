from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.security import (
    SESSION_COOKIE,
    create_session,
    current_user,
    destroy_all_sessions,
    destroy_session,
    hash_password,
    verify_password,
)

# 【帳號 API】網址開頭皆為 /auth
router = APIRouter(prefix="/auth", tags=["帳號"])

ALNUM = r"^[A-Za-z0-9]+$"  # 格式規則：僅限英文與數字


class Credentials(BaseModel):
    # 登入／註冊時前端送來的資料（不符規則會自動拒絕）
    username: str = Field(min_length=1, max_length=32, pattern=ALNUM)  # 帳號
    password: str = Field(min_length=1, max_length=128, pattern=ALNUM)  # 密碼


class ChangePassword(BaseModel):
    # 修改密碼時前端送來的資料
    old_password: str = Field(min_length=1, max_length=128)  # 舊密碼
    new_password: str = Field(min_length=1, max_length=128, pattern=ALNUM)  # 新密碼


@router.post("/register", status_code=201, summary="註冊新帳號並自動登入")
def register(body: Credentials, response: Response, db: Session = Depends(get_db)):
    # 【註冊】建立新帳號並自動登入。
    # 參數：body=帳號與密碼、response=回傳給瀏覽器的物件、db=資料庫連線（自動提供）
    # 1. 帳號已存在則回 409
    if db.scalar(select(User.id).where(User.username == body.username)):
        raise HTTPException(status_code=409, detail="帳號已存在")
    # 2. 密碼加密後存入資料庫
    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # 同時有人註冊相同帳號時的保險處理
        db.rollback()
        raise HTTPException(status_code=409, detail="帳號已存在")
    # 3. 發通行證，直接進入登入狀態
    create_session(response, user.id)
    return {"username": user.username}


@router.post("/login", summary="登入")
def login(body: Credentials, response: Response, db: Session = Depends(get_db)):
    # 【登入】驗證帳密，成功後發通行證。
    # 參數：body=帳號與密碼、response=回傳給瀏覽器的物件、db=資料庫連線（自動提供）
    # 1. 依帳號查使用者
    user = db.scalar(select(User).where(User.username == body.username))
    # 2. 比對密碼；帳號不存在與密碼錯誤給相同訊息，避免洩漏帳號是否存在
    if not verify_password(body.password, user.password_hash if user else None):
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
    # 3. 發通行證
    create_session(response, user.id)
    return {"username": user.username}


@router.post("/logout", status_code=204, summary="登出")
def logout(response: Response, session_id: str | None = Cookie(default=None)):
    # 【登出】讓目前通行證失效。
    # 參數：response=回傳給瀏覽器的物件、session_id=瀏覽器帶來的通行證
    destroy_session(response, session_id)


@router.get("/me", summary="查詢目前登入者")
def me(user: User = Depends(current_user)):
    # 【查詢登入者】回傳目前登入的帳號；未登入會回 401。
    # 參數：user=目前登入者（由通行證自動查出）
    return {"username": user.username}


@router.post("/change-password", status_code=204, summary="修改密碼")
def change_password(
    body: ChangePassword,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    # 【修改密碼】需先登入。
    # 參數：body=舊密碼與新密碼、response=回傳給瀏覽器的物件、user=目前登入者、db=資料庫連線
    # 1. 舊密碼錯誤則拒絕
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="舊密碼錯誤")
    # 2. 新密碼加密後存入
    user.password_hash = hash_password(body.new_password)
    db.commit()
    # 3. 使所有舊登入失效，並讓目前裝置維持登入
    destroy_all_sessions(user.id)
    create_session(response, user.id)
