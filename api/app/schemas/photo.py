from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


class PhotoBase(BaseModel):
    photo_url: str
    photo_type: Literal["received", "processed", "ready"] = "received"
    description: Optional[str] = None


class PhotoCreate(PhotoBase):
    order_id: UUID
    uploaded_by: Optional[UUID] = None


class PhotoResponse(PhotoBase):
    id: UUID
    order_id: UUID
    uploaded_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
