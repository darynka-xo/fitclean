from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


class NotificationBase(BaseModel):
    notification_type: str
    title: str
    message: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"


class NotificationCreate(NotificationBase):
    club_id: int
    recipient_id: Optional[UUID] = None
    order_id: Optional[UUID] = None


class NotificationResponse(NotificationBase):
    id: UUID
    club_id: int
    recipient_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    is_read: bool = False
    created_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    notification_ids: list[UUID]
