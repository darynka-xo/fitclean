"""
Tablet App Routes
Endpoints for tablet/kiosk operations at postamats:
- Client registration/login
- Drop-off items
- Pickup items
- Rating
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date

from ..core.database import get_db
from ..core.security import get_password_hash, verify_password, create_access_token
from ..core.utils import generate_verification_code, generate_order_number, generate_pickup_code
from ..models.user import User
from ..models.order import Order
from ..models.club import Club
from ..models.rating import ClientRating
from ..models.subscription import DimSubscriptionType
from ..services.whatsapp import whatsapp_service

router = APIRouter(prefix="/tablet", tags=["Tablet App"])


# ===========================================
# Status IDs
# ===========================================
STATUS_PENDING = 1          # Waiting for items to be collected by courier
STATUS_IN_PROGRESS = 2      # Being processed (courier picked up, at laundry)
STATUS_READY_FOR_PICKUP = 3 # Clean items in locker
STATUS_COMPLETED = 4        # Customer picked up
STATUS_CANCELED = 5         # Canceled


# ===========================================
# Pydantic Models
# ===========================================

class PhoneCheckRequest(BaseModel):
    phone: str


class LoginRequest(BaseModel):
    phone: str
    pin_code: str


class RegisterRequest(BaseModel):
    phone: str
    verification_code: str
    pin_code: str
    club_id: int
    username: Optional[str] = None
    agreed_to_terms: bool = True


class DropOffRequest(BaseModel):
    user_id: UUID
    club_id: int
    locker_cell_id: str
    locker_device_id: Optional[str] = None
    comment: Optional[str] = None
    subscription_id: Optional[int] = None
    is_tariff_based: bool = False
    price: Optional[float] = None


class PickupRequest(BaseModel):
    user_id: UUID
    order_id: UUID


class RatingRequest(BaseModel):
    user_id: UUID
    order_id: UUID
    rating: int  # 1-5
    comment: Optional[str] = None


class IssueReportRequest(BaseModel):
    user_id: UUID
    order_id: UUID
    issue_description: str


# In-memory verification codes (use Redis in production)
_verification_codes: dict = {}


# ===========================================
# Authentication Routes
# ===========================================

@router.post("/check-phone")
async def check_phone(request: PhoneCheckRequest, db: Session = Depends(get_db)):
    """
    Check if phone is registered
    Returns whether user exists and has PIN set
    """
    phone = request.phone.strip()
    user = db.query(User).filter(User.phone == phone).first()
    
    return {
        "exists": user is not None,
        "has_pin": user.pin_code is not None if user else False,
        "username": user.username if user else None
    }


@router.post("/send-code")
async def send_verification_code(request: PhoneCheckRequest, db: Session = Depends(get_db)):
    """
    Send verification code via WhatsApp for registration
    """
    phone = request.phone.strip()
    
    # Generate 6-digit code
    code = generate_verification_code()
    
    # Store code
    _verification_codes[phone] = {
        "code": code,
        "created_at": datetime.utcnow().isoformat(),
        "attempts": 0
    }
    
    # Send via WhatsApp
    result = await whatsapp_service.send_verification_code(phone, code)
    
    if result.get("success"):
        return {"success": True, "message": "Код отправлен на WhatsApp"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка отправки кода"
        )


@router.post("/verify-code")
async def verify_code(phone: str, code: str):
    """
    Verify the sent code
    """
    stored = _verification_codes.get(phone)
    
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код не найден. Запросите новый."
        )
    
    if stored.get("attempts", 0) >= 3:
        del _verification_codes[phone]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Слишком много попыток. Запросите новый код."
        )
    
    if stored["code"] != code:
        _verification_codes[phone]["attempts"] = stored.get("attempts", 0) + 1
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код"
        )
    
    # Code is correct
    del _verification_codes[phone]
    return {"success": True, "message": "Код подтвержден"}


@router.post("/register")
async def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register new user after phone verification
    """
    phone = request.phone.strip()
    
    # Check if user already exists
    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с этим номером уже существует"
        )
    
    # Create user
    user = User(
        phone=phone,
        username=request.username,
        pin_code=get_password_hash(request.pin_code),
        pin_set_at=datetime.utcnow(),
        club_id=request.club_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create token
    token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "success": True,
        "user_id": str(user.id),
        "username": user.username,
        "access_token": token,
        "message": "Регистрация успешна"
    }


@router.post("/login")
async def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with phone and PIN
    """
    phone = request.phone.strip()
    
    user = db.query(User).filter(User.phone == phone).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные данные"
        )
    
    if not user.pin_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN не установлен"
        )
    
    if not verify_password(request.pin_code, user.pin_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный PIN"
        )
    
    # Create token
    token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "success": True,
        "user_id": str(user.id),
        "username": user.username,
        "club_id": user.club_id,
        "subscription_id": user.subscription_id,
        "access_token": token
    }


# ===========================================
# Drop-off Routes (Client puts dirty items)
# ===========================================

@router.get("/user/{user_id}/subscription")
async def get_user_subscription(user_id: UUID, db: Session = Depends(get_db)):
    """
    Get user's current subscription status
    Returns whether user can use tariff-based drop-off
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    subscription = None
    if user.subscription_id:
        sub = db.query(DimSubscriptionType).filter(
            DimSubscriptionType.id == user.subscription_id
        ).first()
        if sub:
            subscription = {
                "id": sub.id,
                "name": sub.name,
                "code": sub.code,
                "price": float(sub.price) if sub.price else 0
            }
    
    # Count remaining washes (if applicable)
    # This would need a more complex logic based on subscription type
    
    return {
        "user_id": str(user.id),
        "has_active_subscription": user.subscription_id is not None and user.subscription_id > 1,
        "subscription": subscription,
        "subscription_date": user.subscription_date.isoformat() if user.subscription_date else None
    }


@router.get("/subscriptions")
async def get_available_subscriptions(db: Session = Depends(get_db)):
    """
    Get available subscription types for purchase
    """
    subs = db.query(DimSubscriptionType).filter(
        DimSubscriptionType.id > 1  # Exclude "none" subscription
    ).all()
    
    return [
        {
            "id": sub.id,
            "code": sub.code,
            "name": sub.name,
            "price": float(sub.price) if sub.price else 0
        }
        for sub in subs
    ]


@router.post("/drop-off")
async def create_drop_off_order(request: DropOffRequest, db: Session = Depends(get_db)):
    """
    Create order when client drops off dirty items
    Called after tablet app opens locker and client closes it
    
    Flow:
    1. Client authenticates (PIN or Face ID) - handled by tablet
    2. Client selects subscription or pays - handled by tablet
    3. Tablet opens locker cell
    4. Client puts items in cell and closes it
    5. Tablet calls this endpoint to record the order
    6. WhatsApp notification sent to client
    """
    # Verify user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Get club for order number generation
    club = db.query(Club).filter(Club.id == request.club_id).first()
    club_code = club.code.upper() if club else "UNK"
    
    # Get today's sequence number
    today = date.today()
    today_orders = db.query(Order).filter(
        Order.created_date == today,
        Order.club_id == request.club_id
    ).count()
    sequence = today_orders + 1
    
    # Generate order number
    order_number = generate_order_number(club_code, datetime.now(), sequence)
    
    # Generate pickup code
    pickup_code = generate_pickup_code()
    
    # Create order
    order = Order(
        user_id=request.user_id,
        club_id=request.club_id,
        status_id=STATUS_PENDING,  # Waiting for courier
        order_number=order_number,
        daily_sequence=sequence,
        created_date=today,
        locker_cell_id=request.locker_cell_id,
        locker_device_id=request.locker_device_id,
        comment=request.comment,
        is_tariff_based=request.is_tariff_based,
        price=request.price or 0,
        pickup_code=pickup_code
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Send WhatsApp notification
    if user.phone:
        await whatsapp_service.notify_order_accepted(
            phone=user.phone,
            order_number=order_number
        )
    
    return {
        "success": True,
        "order_id": str(order.id),
        "order_number": order_number,
        "pickup_code": pickup_code,
        "status": "pending",
        "message": "Заказ принят. Мы сообщим, когда он будет готов."
    }


# ===========================================
# Pickup Routes (Client picks up clean items)
# ===========================================

@router.get("/user/{user_id}/ready-orders")
async def get_ready_orders(user_id: UUID, db: Session = Depends(get_db)):
    """
    Get orders ready for pickup for this user
    """
    orders = db.query(Order).filter(
        Order.user_id == user_id,
        Order.status_id == STATUS_READY_FOR_PICKUP
    ).all()
    
    return [
        {
            "id": str(order.id),
            "order_number": order.order_number,
            "locker_cell_id": order.locker_cell_id,
            "created_at": order.created_at.isoformat() if order.created_at else None
        }
        for order in orders
    ]


@router.post("/pickup")
async def complete_pickup(request: PickupRequest, db: Session = Depends(get_db)):
    """
    Complete order pickup
    Called after client retrieves items from locker
    
    Flow:
    1. Client authenticates - handled by tablet
    2. System shows ready orders - tablet calls /user/{id}/ready-orders
    3. Tablet opens locker cell
    4. Client takes items and closes cell
    5. Tablet calls this endpoint to mark order completed
    6. Rating prompt shown
    7. WhatsApp notification sent
    """
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заказ не найден"
        )
    
    if order.user_id != request.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Это не ваш заказ"
        )
    
    if order.status_id != STATUS_READY_FOR_PICKUP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Заказ не готов к выдаче"
        )
    
    # Update status
    order.status_id = STATUS_COMPLETED
    order.locker_cell_id = None  # Cell is now free
    db.commit()
    
    # Send completion notification
    user = db.query(User).filter(User.id == request.user_id).first()
    if user and user.phone:
        await whatsapp_service.notify_order_completed(
            phone=user.phone,
            order_number=order.order_number or str(order.id)[:8]
        )
    
    # Check if user is running low on subscription
    # This would need more complex logic
    remaining_washes = None  # Calculate based on subscription type
    
    return {
        "success": True,
        "order_id": str(order.id),
        "order_number": order.order_number,
        "status": "completed",
        "show_rating_prompt": True,
        "subscription_warning": remaining_washes is not None and remaining_washes <= 1,
        "remaining_washes": remaining_washes
    }


# ===========================================
# Rating Routes
# ===========================================

@router.post("/rate")
async def submit_rating(request: RatingRequest, db: Session = Depends(get_db)):
    """
    Submit rating for completed order
    """
    # Verify order belongs to user and is completed
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order or order.user_id != request.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Заказ не найден"
        )
    
    # Create rating
    rating = ClientRating(
        user_id=request.user_id,
        order_id=request.order_id,
        rating=request.rating,
        comment=request.comment
    )
    db.add(rating)
    db.commit()
    
    return {
        "success": True,
        "message": "Спасибо за отзыв!"
    }


@router.post("/report-issue")
async def report_issue(request: IssueReportRequest, db: Session = Depends(get_db)):
    """
    Report an issue with an order (thumbs down scenario)
    Sends alert to admin via WhatsApp
    """
    user = db.query(User).filter(User.id == request.user_id).first()
    order = db.query(Order).filter(Order.id == request.order_id).first()
    
    if not user or not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь или заказ не найден"
        )
    
    # Create negative rating
    rating = ClientRating(
        user_id=request.user_id,
        order_id=request.order_id,
        rating=1,  # Lowest rating
        comment=request.issue_description
    )
    db.add(rating)
    db.commit()
    
    # Alert admin via WhatsApp
    admin_phone = "+77072331465"  # Admin phone
    await whatsapp_service.notify_admin_issue(
        admin_phone=admin_phone,
        client_name=user.username or "Unknown",
        client_phone=user.phone or "Unknown",
        order_number=order.order_number or str(order.id)[:8],
        issue_description=request.issue_description
    )
    
    # Notify customer that we received their complaint
    if user.phone:
        await whatsapp_service.notify_issue_reported(
            phone=user.phone,
            order_number=order.order_number or str(order.id)[:8]
        )
    
    return {
        "success": True,
        "message": "Мы получили вашу жалобу. Менеджер свяжется с вами."
    }


# ===========================================
# Club Info
# ===========================================

@router.get("/club/{club_id}")
async def get_club_info(club_id: int, db: Session = Depends(get_db)):
    """
    Get club information for tablet display
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Клуб не найден"
        )
    
    return {
        "id": club.id,
        "code": club.code,
        "name": club.name
    }
