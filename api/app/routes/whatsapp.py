"""
WhatsApp Notification Routes
Endpoints for sending WhatsApp notifications and verification codes
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from ..core.database import get_db
from ..core.utils import generate_verification_code
from ..services.whatsapp import whatsapp_service
from ..models.order import Order
from ..models.user import User
from ..models.notification import NotificationLog

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# ===========================================
# Pydantic Models
# ===========================================

class SendMessageRequest(BaseModel):
    phone: str
    message: str


class SendVerificationRequest(BaseModel):
    phone: str


class OrderNotificationRequest(BaseModel):
    order_id: UUID
    notification_type: str  # accepted, received, washed, ready, completed, reminder, issue


class IssueReportRequest(BaseModel):
    order_id: UUID
    client_name: str
    client_phone: str
    issue_description: str
    admin_phone: str = "+77072331465"  # Admin phone


# ===========================================
# Routes
# ===========================================

@router.post("/send")
async def send_whatsapp_message(
    request: SendMessageRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send a custom WhatsApp message"""
    result = await whatsapp_service.send_message(request.phone, request.message)
    
    # Note: NotificationLog requires user_id, so we skip logging for anonymous sends
    # In production, should look up user by phone or require user_id
    
    return result


@router.post("/send-verification")
async def send_verification_code(
    request: SendVerificationRequest,
    db: Session = Depends(get_db)
):
    """Send SMS/WhatsApp verification code for registration"""
    code = generate_verification_code()
    
    result = await whatsapp_service.send_verification_code(request.phone, code)
    
    if result.get("success"):
        return {"success": True, "code": code, "message": "Verification code sent"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification code: {result.get('error')}"
        )


@router.post("/notify-order")
async def send_order_notification(
    request: OrderNotificationRequest,
    db: Session = Depends(get_db)
):
    """Send order status notification to client"""
    # Get order with user and club info
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    user = db.query(User).filter(User.id == order.user_id).first()
    if not user or not user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User or phone not found"
        )
    
    order_number = order.order_number or str(order.id)[:8]
    club_name = order.club.name if order.club else "FitClean"
    cell_number = order.locker_cell_id or "N/A"
    bag_number = order.package_id or "N/A"
    
    # Send appropriate notification based on type
    notification_map = {
        "accepted": lambda: whatsapp_service.notify_order_accepted(user.phone, order_number),
        "received": lambda: whatsapp_service.notify_items_received_at_laundry(user.phone, order_number, bag_number),
        "washed": lambda: whatsapp_service.notify_items_washed(user.phone, order_number),
        "ready": lambda: whatsapp_service.notify_ready_for_pickup(user.phone, order_number, club_name, cell_number),
        "completed": lambda: whatsapp_service.notify_order_completed(user.phone, order_number),
        "reminder": lambda: whatsapp_service.notify_pickup_reminder(user.phone, order_number, cell_number),
        "issue": lambda: whatsapp_service.notify_issue_reported(user.phone, order_number),
    }
    
    if request.notification_type not in notification_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid notification type: {request.notification_type}"
        )
    
    result = await notification_map[request.notification_type]()
    
    # Log notification
    log = NotificationLog(
        user_id=user.id,
        order_id=order.id,
        notification_type=f"order_{request.notification_type}",
        channel="whatsapp",
        whatsapp_sent=result.get("success", False),
        error_message=result.get("error")
    )
    db.add(log)
    db.commit()
    
    return result


@router.post("/report-issue")
async def report_issue_to_admin(
    request: IssueReportRequest,
    db: Session = Depends(get_db)
):
    """Report customer issue to admin via WhatsApp"""
    order = db.query(Order).filter(Order.id == request.order_id).first()
    order_number = order.order_number if order else str(request.order_id)[:8]
    
    result = await whatsapp_service.notify_admin_issue(
        admin_phone=request.admin_phone,
        client_name=request.client_name,
        client_phone=request.client_phone,
        order_number=order_number,
        issue_description=request.issue_description
    )
    
    # Note: Admin notifications are not logged as they don't have a user_id
    
    return result


@router.post("/notify-subscription-expiring")
async def notify_subscription_expiring(
    phone: str,
    remaining_washes: int,
    user_id: Optional[UUID] = None,
    payment_link: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Notify user about expiring subscription"""
    result = await whatsapp_service.notify_subscription_expiring(
        phone=phone,
        remaining_washes=remaining_washes,
        payment_link=payment_link
    )
    
    # Log notification if user_id provided
    if user_id:
        log = NotificationLog(
            user_id=user_id,
            notification_type="subscription_expiring",
            channel="whatsapp",
            whatsapp_sent=result.get("success", False),
            error_message=result.get("error")
        )
        db.add(log)
        db.commit()
    
    return result
