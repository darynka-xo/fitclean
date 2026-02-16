from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    chat_id: Optional[int] = None
    club_id: Optional[int] = None
    subscription_id: Optional[int] = None
    role: Optional[str] = None


class UserCreate(UserBase):
    pin_code: Optional[str] = Field(None, min_length=4, max_length=6)


class UserUpdate(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    club_id: Optional[int] = None
    subscription_id: Optional[int] = None
    role: Optional[str] = None
    pin_code: Optional[str] = Field(None, min_length=4, max_length=6)
    notify_on_status_change: Optional[bool] = None
    notify_on_pickup_ready: Optional[bool] = None


class UserLogin(BaseModel):
    phone: str
    pin_code: str = Field(..., min_length=4, max_length=6)


class UserResponse(UserBase):
    id: UUID
    subscription_date: Optional[datetime] = None
    subscription_expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    notify_on_status_change: Optional[bool] = True
    notify_on_pickup_ready: Optional[bool] = True
    telegram_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserWithToken(UserResponse):
    access_token: str
    token_type: str = "bearer"
