import os
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db import get_db, redis_client
from app.models import User

# ── 登入相關設定 ──
SESSION_COOKIE = "session_id"  # 瀏覽器中存放「通行證」的名稱
SESSION_TTL = 7 * 24 * 3600  # 通行證有效秒數（7 天）
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"  # 正式環境設 true：僅限加密連線傳送

_hasher = PasswordHasher()  # 密碼加密工具（argon2）
# 帳號不存在時仍跑一次驗證，避免以回應時間推測帳號是否存在
_DUMMY_HASH = _hasher.hash("dummy-password")


def hash_password(password: str) -> str:
    # 【密碼加密】把明文密碼轉成無法還原的密文，資料庫只存密文。
    # 參數：password=使用者輸入的明文密碼
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    # 【密碼比對】檢查輸入的密碼是否正確，正確回傳 True。
    # 參數：password=使用者輸入的密碼、password_hash=資料庫中的密文（帳號不存在時為 None）
    try:
        # 1. 與密文比對；帳號不存在時改用假密文比對，讓耗時一致
        # 2. 帳號不存在一律視為失敗
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and bool(password_hash)
    except (VerifyMismatchError, InvalidHashError):
        # 密碼不符或密文格式錯誤
        return False


def create_session(response: Response, user_id: int) -> None:
    # 【建立登入狀態】登入成功後發一張「通行證」，之後不必重新輸入密碼。
    # 參數：response=回傳給瀏覽器的物件、user_id=使用者編號
    # 1. 產生一組隨機通行證
    token = secrets.token_urlsafe(32)
    # 2. 存進 Redis（記憶庫）：記錄通行證屬於誰，並登記在該使用者名下，7 天後自動失效
    pipe = redis_client.pipeline()
    pipe.set(f"session:{token}", user_id, ex=SESSION_TTL)
    pipe.sadd(f"user_sessions:{user_id}", token)
    pipe.expire(f"user_sessions:{user_id}", SESSION_TTL)
    pipe.execute()
    # 3. 把通行證交給瀏覽器（httponly=網頁腳本讀不到，較安全）
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
    # 【登出】讓目前這張通行證失效。
    # 參數：response=回傳給瀏覽器的物件、token=瀏覽器帶來的通行證（可能沒有）
    if token:
        # 1. 查出通行證屬於誰
        user_id = redis_client.get(f"session:{token}")
        # 2. 刪除通行證
        redis_client.delete(f"session:{token}")
        # 3. 從該使用者的通行證清單中移除
        if user_id:
            redis_client.srem(f"user_sessions:{user_id}", token)
    # 4. 通知瀏覽器清掉通行證
    response.delete_cookie(SESSION_COOKIE, path="/")


def destroy_all_sessions(user_id: int) -> None:
    # 【全裝置登出】讓某位使用者所有裝置的通行證都失效。
    # 參數：user_id=使用者編號
    # 1. 取出該使用者的所有通行證
    key = f"user_sessions:{user_id}"
    tokens = redis_client.smembers(key)
    # 2. 逐一刪除
    if tokens:
        redis_client.delete(*[f"session:{t}" for t in tokens])
    # 3. 清空清單本身
    redis_client.delete(key)


def current_user(
    session_id: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    # 【取得目前登入者】需要登入的 API 用它確認身分，未登入則回 401。
    # 參數：session_id=瀏覽器帶來的通行證、db=資料庫連線（系統自動提供）
    # 1. 用通行證到 Redis 查出使用者編號
    user_id = redis_client.get(f"session:{session_id}") if session_id else None
    # 2. 依編號從資料庫取得使用者
    user = db.get(User, int(user_id)) if user_id else None
    # 3. 找不到代表未登入或通行證過期
    if user is None:
        raise HTTPException(status_code=401, detail="未登入")
    return user
