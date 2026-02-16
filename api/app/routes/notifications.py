from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.notification import EmployeeNotification
from ..models.user import User
from ..schemas.notification import NotificationCreate, NotificationResponse, NotificationMarkRead

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db)
):
    """Create a new notification"""
    notification = EmployeeNotification(**notification_data.model_dump())
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    club_id: Optional[int] = None,
    is_read: Optional[bool] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List notifications with optional filters"""
    query = db.query(EmployeeNotification)
    
    if club_id:
        query = query.filter(EmployeeNotification.club_id == club_id)
    if is_read is not None:
        query = query.filter(EmployeeNotification.is_read == is_read)
    if priority:
        query = query.filter(EmployeeNotification.priority == priority)
    
    notifications = query.order_by(
        EmployeeNotification.created_at.desc()
    ).offset(skip).limit(limit).all()
    return notifications


@router.get("/unread/count")
async def get_unread_count(
    club_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    query = db.query(EmployeeNotification).filter(EmployeeNotification.is_read == False)
    
    if club_id:
        query = query.filter(EmployeeNotification.club_id == club_id)
    
    count = query.count()
    return {"unread_count": count}


@router.put("/mark-read", response_model=List[NotificationResponse])
async def mark_notifications_read(
    mark_data: NotificationMarkRead,
    db: Session = Depends(get_db)
):
    """Mark notifications as read"""
    notifications = db.query(EmployeeNotification).filter(
        EmployeeNotification.id.in_(mark_data.notification_ids)
    ).all()
    
    for notification in notifications:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
    
    db.commit()
    return notifications


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db)
):
    """Mark a single notification as read"""
    notification = db.query(EmployeeNotification).filter(
        EmployeeNotification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/order/{order_id}", response_model=List[NotificationResponse])
async def get_order_notifications(order_id: UUID, db: Session = Depends(get_db)):
    """Get all notifications for an order"""
    notifications = db.query(EmployeeNotification).filter(
        EmployeeNotification.order_id == order_id
    ).order_by(EmployeeNotification.created_at.desc()).all()
    return notifications
