import os
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db import get_db, redis_client
from app.models import User

SESSION_COOKIE = "session_id"
SESSION_TTL = 7 * 24 * 3600
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

_hasher = PasswordHasher()
# 帳號不存在時仍跑一次驗證，避免以回應時間推測帳號是否存在
_DUMMY_HASH = _hasher.hash("dummy-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and bool(password_hash)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_session(response: Response, user_id: int) -> None:
    token = secrets.token_urlsafe(32)
    pipe = redis_client.pipeline()
    pipe.set(f"session:{token}", user_id, ex=SESSION_TTL)
    pipe.sadd(f"user_sessions:{user_id}", token)
    pipe.expire(f"user_sessions:{user_id}", SESSION_TTL)
    pipe.execute()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_TTL,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )


def destroy_session(response: Response, token: str | None) -> None:
    if token:
        user_id = redis_client.get(f"session:{token}")
        redis_client.delete(f"session:{token}")
        if user_id:
            redis_client.srem(f"user_sessions:{user_id}", token)
    response.delete_cookie(SESSION_COOKIE, path="/")


def destroy_all_sessions(user_id: int) -> None:
    key = f"user_sessions:{user_id}"
    tokens = redis_client.smembers(key)
    if tokens:
        redis_client.delete(*[f"session:{t}" for t in tokens])
    redis_client.delete(key)


def current_user(
    session_id: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    user_id = redis_client.get(f"session:{session_id}") if session_id else None
    user = db.get(User, int(user_id)) if user_id else None
    if user is None:
        raise HTTPException(status_code=401, detail="未登入")
    return user
