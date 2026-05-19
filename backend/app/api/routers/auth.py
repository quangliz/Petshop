import uuid
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select

from app.api.deps import SessionDep, CurrentUser
from app.core.limiter import limiter
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    create_reset_token,
)
from app.core.email import send_reset_email
from app.models.user import User

router = APIRouter()

REFRESH_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    role: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = Field(default=None, max_length=500)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


def _user_response(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "address": user.address,
        "role": str(user.role.value),
    }


@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_in: UserRegister, db: SessionDep) -> Any:
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()
    if user:
        raise HTTPException(status_code=400, detail="Email đã được đăng ký trong hệ thống.")
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_response(user)


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, db: SessionDep, form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác")
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
async def refresh(request: Request, db: SessionDep) -> Any:
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Không có refresh token")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
        user_id = payload.get("sub")
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Người dùng không tồn tại")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    new_access = create_access_token(subject=str(user.id))
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest, db: SessionDep) -> Any:
    msg = "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu."
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        return {"message": msg}
    token = create_reset_token(subject=str(user.id))
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    try:
        await send_reset_email(user.email, reset_link)
    except Exception:
        raise HTTPException(status_code=500, detail="Không thể gửi email. Vui lòng thử lại sau.")
    return {"message": msg}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, body: ResetPasswordRequest, db: SessionDep) -> Any:
    try:
        payload = jwt.decode(body.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Token không hợp lệ")
        result = await db.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=400, detail="Token không hợp lệ")
    except JWTError:
        raise HTTPException(status_code=400, detail="Token không hợp lệ hoặc đã hết hạn")
    user.hashed_password = get_password_hash(body.new_password)
    await db.commit()
    return {"message": "Mật khẩu đã được cập nhật."}


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(request: Request, body: ChangePasswordRequest, db: SessionDep, current_user: CurrentUser) -> Any:
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    current_user.hashed_password = get_password_hash(body.new_password)
    await db.commit()
    return {"message": "Đã đổi mật khẩu thành công."}


@router.post("/logout")
async def logout(response: Response) -> Any:
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return {"message": "Đã đăng xuất."}


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/google", response_model=Token)
async def google_login(body: GoogleAuthRequest, response: Response, db: SessionDep) -> Any:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth chưa được cấu hình")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": body.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": body.redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if token_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Không thể xác thực với Google")

    id_token = token_res.json().get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Google không trả về ID token")

    async with httpx.AsyncClient() as client:
        info_res = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        )
    if info_res.status_code != 200:
        raise HTTPException(status_code=400, detail="ID token không hợp lệ")

    info = info_res.json()
    if info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="ID token không hợp lệ")

    email: str = info.get("email", "")
    full_name: str = info.get("name") or email.split("@")[0]

    if not email:
        raise HTTPException(status_code=400, detail="Không lấy được email từ Google")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            hashed_password=get_password_hash(uuid.uuid4().hex),
            full_name=full_name,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: CurrentUser) -> Any:
    return _user_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_user_me(user_in: UserUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.phone is not None:
        current_user.phone = user_in.phone
    if user_in.address is not None:
        current_user.address = user_in.address
    await db.commit()
    await db.refresh(current_user)
    return _user_response(current_user)
