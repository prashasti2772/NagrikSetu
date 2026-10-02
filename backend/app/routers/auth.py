import hashlib
import hmac
import secrets
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.core.security import access_token, password_hasher, dummy_hash, get_current_user
from app.core.otp import get_otp_delivery
from app.db.database import get_db
from app.models.complaint import utc_now
from app.models.domain import User, PasswordOTP
from app.schemas.domain import Register, Login, EmailInput, OTPVerify, Reset, UserRead

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def digest(value):
    return hmac.new(settings.jwt_secret.encode(), value.encode(), hashlib.sha256).hexdigest()

@router.post("/register", dependencies=[Depends(rate_limit("register", settings.rate_limit_register))], response_model=UserRead, status_code=201)
def register(payload: Register, db: Session = Depends(get_db)):
    user = User(**payload.model_dump(exclude={"password"}), password_hash=password_hasher.hash(payload.password), role="citizen")
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered") from None
    db.refresh(user)
    return user

@router.post("/login", dependencies=[Depends(rate_limit("login", settings.rate_limit_login))])
def login(payload: Login, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    valid = password_hasher.verify(payload.password, user.password_hash if user else dummy_hash)
    if not valid or user is None or not user.is_active:
        raise HTTPException(401, "Invalid email or password")
    return {"access_token": access_token(user), "token_type": "bearer"}

@router.get("/me", response_model=UserRead)
def me(user = Depends(get_current_user)):
    return user

@router.post("/forgot-password", dependencies=[Depends(rate_limit("forgot-password", settings.rate_limit_forgot))])
def forgot(payload: EmailInput, db: Session = Depends(get_db), delivery = Depends(get_otp_delivery)):
    message = {"message": "If the account is eligible, a password reset code has been sent"}
    user = db.scalar(select(User).where(User.email == payload.email, User.is_active.is_(True)))
    if user is None:
        return message
    latest = db.scalar(select(PasswordOTP).where(PasswordOTP.email == payload.email).order_by(PasswordOTP.id.desc()))
    if latest and latest.created_at > utc_now() - timedelta(seconds=60):
        return message
    db.execute(update(PasswordOTP).where(PasswordOTP.email == payload.email).values(used=True, reset_hash=None))
    code = f"{secrets.randbelow(1000000):06d}"
    db.add(PasswordOTP(email=payload.email, otp_hash=digest(payload.email + ":" + code),
                       expiry=utc_now() + timedelta(minutes=settings.otp_expire_minutes)))
    db.commit()
    delivery.send(payload.email, code)
    return message

@router.post("/verify-otp", dependencies=[Depends(rate_limit("verify-otp", settings.rate_limit_verify))])
def verify(payload: OTPVerify, db: Session = Depends(get_db)):
    otp = db.scalar(select(PasswordOTP).where(PasswordOTP.email == payload.email).order_by(PasswordOTP.id.desc()))
    if not otp or otp.used or otp.expiry <= utc_now() or otp.attempts >= 5:
        raise HTTPException(400, "Invalid or expired code")
    # Conditional update makes attempt accounting and successful consumption atomic.
    result = db.execute(update(PasswordOTP).where(PasswordOTP.id == otp.id, PasswordOTP.used.is_(False),
                        PasswordOTP.attempts == otp.attempts).values(attempts=PasswordOTP.attempts + 1))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(400, "Invalid or expired code")
    if not hmac.compare_digest(otp.otp_hash, digest(payload.email + ":" + payload.otp)):
        db.commit()
        raise HTTPException(400, "Invalid or expired code")
    token = secrets.token_urlsafe(48)
    otp.used = True
    otp.reset_hash = digest(token)
    db.commit()
    return {"reset_token": token}

@router.post("/reset-password", dependencies=[Depends(rate_limit("reset-password", settings.rate_limit_verify))])
def reset(payload: Reset, db: Session = Depends(get_db)):
    otp = db.scalar(select(PasswordOTP).where(PasswordOTP.reset_hash == digest(payload.reset_token),
                    PasswordOTP.used.is_(True), PasswordOTP.expiry > utc_now()))
    if not otp:
        raise HTTPException(400, "Invalid or expired reset token")
    result = db.execute(update(PasswordOTP).where(PasswordOTP.id == otp.id,
                        PasswordOTP.reset_hash == digest(payload.reset_token)).values(reset_hash=None))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(400, "Invalid or expired reset token")
    user = db.scalar(select(User).where(User.email == otp.email, User.is_active.is_(True)))
    if not user:
        db.rollback()
        raise HTTPException(400, "Invalid or expired reset token")
    user.password_hash = password_hasher.hash(payload.new_password)
    user.token_version += 1
    db.execute(update(PasswordOTP).where(PasswordOTP.email == otp.email).values(used=True, reset_hash=None))
    db.commit()
    return {"message": "Password updated"}
