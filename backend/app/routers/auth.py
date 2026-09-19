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

router = APIRouter(prefix="/auth", tags=["auth"])

ALNUM = r"^[A-Za-z0-9]+$"


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=32, pattern=ALNUM)
    password: str = Field(min_length=1, max_length=128, pattern=ALNUM)


class ChangePassword(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=1, max_length=128, pattern=ALNUM)


@router.post("/register", status_code=201)
def register(body: Credentials, response: Response, db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.username == body.username)):
        raise HTTPException(status_code=409, detail="帳號已存在")
    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="帳號已存在")
    create_session(response, user.id)
    return {"username": user.username}


@router.post("/login")
def login(body: Credentials, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if not verify_password(body.password, user.password_hash if user else None):
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
    create_session(response, user.id)
    return {"username": user.username}


@router.post("/logout", status_code=204)
def logout(response: Response, session_id: str | None = Cookie(default=None)):
    destroy_session(response, session_id)


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"username": user.username}


@router.post("/change-password", status_code=204)
def change_password(
    body: ChangePassword,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="舊密碼錯誤")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    # 使所有舊登入失效，並讓目前裝置維持登入
    destroy_all_sessions(user.id)
    create_session(response, user.id)
