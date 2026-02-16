from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from ..core.database import get_db
from ..core.security import get_current_user, get_password_hash, verify_password, create_access_token
from ..core.utils import generate_verification_code, generate_pin_code
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate, UserResponse, UserLogin, UserWithToken
from ..services.whatsapp import whatsapp_service

router = APIRouter(prefix="/users", tags=["Users"])

# In-memory verification codes storage (use Redis in production)
_verification_codes: dict = {}


# Additional Pydantic models for verification
class SendVerificationRequest(BaseModel):
    phone: str


class VerifyCodeRequest(BaseModel):
    phone: str
    code: str


class SetPinRequest(BaseModel):
    phone: str
    pin_code: str
    club_id: Optional[int] = None


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user (admin panel)"""
    # Check if phone already exists
    if user_data.phone:
        existing = db.query(User).filter(User.phone == user_data.phone).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this phone already exists"
            )
    
    # Check if email already exists
    if user_data.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
    
    # Create user
    user = User(
        username=user_data.username,
        phone=user_data.phone,
        email=user_data.email,
        chat_id=user_data.chat_id,
        club_id=user_data.club_id,
        subscription_id=user_data.subscription_id,
        role=user_data.role or 'client',
    )
    
    # Hash PIN if provided
    if user_data.pin_code:
        user.pin_code = get_password_hash(user_data.pin_code)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.post("/register", response_model=UserWithToken, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if phone already exists
    if user_data.phone:
        existing = db.query(User).filter(User.phone == user_data.phone).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this phone already exists"
            )
    
    # Create user
    user = User(
        username=user_data.username,
        phone=user_data.phone,
        email=user_data.email,
        chat_id=user_data.chat_id,
        club_id=user_data.club_id,
        subscription_id=user_data.subscription_id,
        role=user_data.role or 'client',
    )
    
    # Hash PIN if provided
    if user_data.pin_code:
        user.pin_code = get_password_hash(user_data.pin_code)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return UserWithToken(
        **UserResponse.model_validate(user).model_dump(),
        access_token=access_token
    )


@router.post("/login", response_model=UserWithToken)
async def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login with phone and PIN"""
    user = db.query(User).filter(User.phone == login_data.phone).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.pin_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN not set for this user"
        )
    
    if not verify_password(login_data.pin_code, user.pin_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return UserWithToken(
        **UserResponse.model_validate(user).model_dump(),
        access_token=access_token
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.get("/", response_model=List[UserResponse])
async def list_users(
    club_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List users with optional club filter"""
    query = db.query(User)
    if club_id:
        query = query.filter(User.club_id == club_id)
    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    """Update user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Handle PIN update separately
    if "pin_code" in update_data and update_data["pin_code"]:
        update_data["pin_code"] = get_password_hash(update_data["pin_code"])
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    """Delete user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    return {"success": True, "message": "User deleted"}


@router.get("/phone/{phone}", response_model=UserResponse)
async def get_user_by_phone(phone: str, db: Session = Depends(get_db)):
    """Get user by phone number"""
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.get("/chat/{chat_id}", response_model=UserResponse)
async def get_user_by_chat_id(chat_id: int, db: Session = Depends(get_db)):
    """Get user by Telegram chat ID"""
    user = db.query(User).filter(User.chat_id == chat_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


# ===========================================
# Phone Verification Flow (for tablet registration)
# ===========================================

@router.post("/send-verification")
async def send_phone_verification(request: SendVerificationRequest, db: Session = Depends(get_db)):
    """
    Step 1 of registration: Send verification code to phone via WhatsApp
    Used by tablet app for new user registration
    """
    phone = request.phone.strip()
    
    # Generate 6-digit code
    code = generate_verification_code()
    
    # Store code (with expiry - should use Redis in production)
    _verification_codes[phone] = {
        "code": code,
        "created_at": datetime.utcnow().isoformat(),
        "attempts": 0
    }
    
    # Send via WhatsApp
    result = await whatsapp_service.send_verification_code(phone, code)
    
    if result.get("success"):
        return {
            "success": True,
            "message": "Verification code sent",
            "phone": phone
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send code: {result.get('error')}"
        )


@router.post("/verify-code")
async def verify_phone_code(request: VerifyCodeRequest, db: Session = Depends(get_db)):
    """
    Step 2 of registration: Verify the code sent to phone
    Returns whether user exists (for login vs registration flow)
    """
    phone = request.phone.strip()
    
    # Check if code exists
    stored = _verification_codes.get(phone)
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found. Please request a new code."
        )
    
    # Check attempts
    if stored.get("attempts", 0) >= 3:
        del _verification_codes[phone]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many attempts. Please request a new code."
        )
    
    # Verify code
    if stored["code"] != request.code:
        _verification_codes[phone]["attempts"] = stored.get("attempts", 0) + 1
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Code is correct - check if user exists
    existing_user = db.query(User).filter(User.phone == phone).first()
    
    # Clean up verification code
    del _verification_codes[phone]
    
    if existing_user:
        # User exists - check if PIN is set
        return {
            "success": True,
            "user_exists": True,
            "has_pin": existing_user.pin_code is not None,
            "user_id": str(existing_user.id),
            "message": "Phone verified. User exists."
        }
    else:
        return {
            "success": True,
            "user_exists": False,
            "has_pin": False,
            "message": "Phone verified. Please set PIN to complete registration."
        }


@router.post("/set-pin", response_model=UserWithToken)
async def set_user_pin(request: SetPinRequest, db: Session = Depends(get_db)):
    """
    Step 3 of registration: Set PIN for new or existing user
    Creates user if doesn't exist, sets PIN, returns token
    """
    phone = request.phone.strip()
    
    # Check if user exists
    user = db.query(User).filter(User.phone == phone).first()
    
    if user:
        # Update existing user's PIN
        user.pin_code = get_password_hash(request.pin_code)
        user.pin_set_at = datetime.utcnow()
        if request.club_id:
            user.club_id = request.club_id
    else:
        # Create new user
        user = User(
            phone=phone,
            pin_code=get_password_hash(request.pin_code),
            pin_set_at=datetime.utcnow(),
            club_id=request.club_id
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return UserWithToken(
        **UserResponse.model_validate(user).model_dump(),
        access_token=access_token
    )


@router.post("/check-phone")
async def check_phone_exists(phone: str, db: Session = Depends(get_db)):
    """Check if phone number is registered"""
    user = db.query(User).filter(User.phone == phone).first()
    return {
        "exists": user is not None,
        "has_pin": user.pin_code is not None if user else False
    }
