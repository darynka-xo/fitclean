from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID


class OrderBase(BaseModel):
    user_id: Optional[UUID] = None
    price: Optional[float] = None
    package_id: Optional[str] = None
    club_id: Optional[int] = None
    status_id: Optional[int] = None
    is_tariff_based: Optional[bool] = False
    tariff_price: Optional[float] = None
    locker_device_id: Optional[str] = None
    locker_cell_id: Optional[str] = None


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    status_id: Optional[int] = None
    price: Optional[float] = None
    receipt_url: Optional[str] = None
    locker_device_id: Optional[str] = None
    locker_cell_id: Optional[str] = None


class OrderResponse(OrderBase):
    id: UUID
    receipt_url: Optional[str] = None
    pickup_code: Optional[str] = None
    order_number: Optional[str] = None
    daily_sequence: Optional[int] = None
    created_date: Optional[date] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class OrderWithDetails(OrderResponse):
    """Order with related data"""
    username: Optional[str] = None
    phone: Optional[str] = None
    subscription_type: Optional[str] = None
    status_name: Optional[str] = None
    status_code: Optional[str] = None
    club_name: Optional[str] = None
    club_code: Optional[str] = None
    rating: Optional[int] = None
    rating_comment: Optional[str] = None


class PickupCodeVerify(BaseModel):
    pickup_code: str
    club_id: Optional[int] = None
