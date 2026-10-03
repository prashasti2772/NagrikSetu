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
from app.core.otp import get_otp_delivery, get_email_verification_delivery, get_registration_email_delivery
from app.services.email import EmailDeliveryUnavailable
from app.db.database import get_db
from app.models.complaint import utc_now
from app.models.domain import User, PasswordOTP
from app.schemas.domain import Register, Login, EmailInput, OTPVerify, Reset, ProfilePatch, UserRead, EmailVerification

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def digest(value):
    return hmac.new(settings.jwt_secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def _otp_digest(email, code, purpose):
    # Keep legacy password-reset digests usable after the additive migration.
    value = email + ":" + code
    return digest(value if purpose == "password_reset" else purpose + ":" + value)


def _send_code(db, email, purpose, delivery):
    scope = (PasswordOTP.email == email, PasswordOTP.purpose == purpose)
    latest = db.scalar(select(PasswordOTP).where(*scope).order_by(PasswordOTP.id.desc()))
    if latest and latest.created_at > utc_now() - timedelta(seconds=60):
        return
    code = f"{secrets.randbelow(1000000):06d}"
    try:
        db.execute(update(PasswordOTP).where(*scope).values(used=True, reset_hash=None))
        db.add(PasswordOTP(email=email, purpose=purpose, otp_hash=_otp_digest(email, code, purpose),
                           expiry=utc_now() + timedelta(minutes=settings.otp_expire_minutes)))
        delivery.send(email, code)
        db.commit()
    except EmailDeliveryUnavailable:
        # Failed delivery must not create a cooldown or invalidate prior valid codes.
        db.rollback()
        raise HTTPException(503, "Security email delivery is unavailable; please try again later") from None


def _check_code(db, email, code, purpose):
    otp = db.scalar(select(PasswordOTP).where(PasswordOTP.email == email,
                    PasswordOTP.purpose == purpose).order_by(PasswordOTP.id.desc()))
    if not otp or otp.used or otp.expiry <= utc_now() or otp.attempts >= 5:
        raise HTTPException(400, "Invalid or expired code")
    result = db.execute(update(PasswordOTP).where(PasswordOTP.id == otp.id, PasswordOTP.used.is_(False),
                        PasswordOTP.expiry > utc_now(), PasswordOTP.attempts == otp.attempts,
                        PasswordOTP.attempts < 5).values(attempts=PasswordOTP.attempts + 1))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(400, "Invalid or expired code")
    if not hmac.compare_digest(otp.otp_hash, _otp_digest(email, code, purpose)):
        db.commit()
        raise HTTPException(400, "Invalid or expired code")
    otp.used = True
    return otp

@router.post("/register", dependencies=[Depends(rate_limit("register", settings.rate_limit_register))], response_model=UserRead, status_code=201)
def register(payload: Register, db: Session = Depends(get_db),
             delivery=Depends(get_registration_email_delivery)):
    user = User(**payload.model_dump(exclude={"password"}), password_hash=password_hasher.hash(payload.password), role="citizen")
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered") from None
    db.refresh(user)
    if delivery is not None:
        try:
            _send_code(db, user.email, "email_verification", delivery)
        except HTTPException:
            # A configured provider is optional for registration; users can retry verification later.
            pass
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

@router.patch("/me", response_model=UserRead)
def update_me(payload: ProfilePatch, db: Session = Depends(get_db), user = Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(422, "Provide at least one profile field")
    if "full_name" in changes and changes["full_name"] is None:
        raise HTTPException(422, "Full name cannot be null")
    for field, value in changes.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

@router.post("/forgot-password", dependencies=[Depends(rate_limit("forgot-password", settings.rate_limit_forgot))])
def forgot(payload: EmailInput, db: Session = Depends(get_db), delivery = Depends(get_otp_delivery)):
    message = {"message": "If the account is eligible, a password reset code has been sent"}
    user = db.scalar(select(User).where(User.email == payload.email, User.is_active.is_(True)))
    if user is None:
        return message
    try:
        _send_code(db, payload.email, "password_reset", delivery)
    except HTTPException:
        # Preserve the generic response for unknown, disabled, and failed-delivery accounts.
        return message
    return message

@router.post("/verify-otp", dependencies=[Depends(rate_limit("verify-otp", settings.rate_limit_verify))])
def verify(payload: OTPVerify, db: Session = Depends(get_db)):
    otp = _check_code(db, payload.email, payload.otp, "password_reset")
    token = secrets.token_urlsafe(48)
    otp.reset_hash = digest(token)
    db.commit()
    return {"reset_token": token}

@router.post("/reset-password", dependencies=[Depends(rate_limit("reset-password", settings.rate_limit_verify))])
def reset(payload: Reset, db: Session = Depends(get_db)):
    otp = db.scalar(select(PasswordOTP).where(PasswordOTP.purpose == "password_reset",
                    PasswordOTP.reset_hash == digest(payload.reset_token),
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
    db.execute(update(PasswordOTP).where(PasswordOTP.email == otp.email,
               PasswordOTP.purpose == "password_reset").values(used=True, reset_hash=None))
    db.commit()
    return {"message": "Password updated"}


@router.post("/request-email-verification", dependencies=[Depends(rate_limit("request-email-verification", settings.rate_limit_forgot))])
def request_email_verification(db: Session = Depends(get_db), user=Depends(get_current_user),
                               delivery=Depends(get_email_verification_delivery)):
    if user.email_verified:
        return {"message": "Email address is already verified"}
    _send_code(db, user.email, "email_verification", delivery)
    return {"message": "An email verification code has been sent"}


@router.post("/verify-email", dependencies=[Depends(rate_limit("verify-email", settings.rate_limit_verify))])
def verify_email(payload: EmailVerification, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _check_code(db, user.email, payload.otp, "email_verification")
    user.email_verified = True
    db.commit()
    return {"message": "Email address verified", "email_verified": True}
