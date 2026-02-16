from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class RatingBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class RatingCreate(RatingBase):
    order_id: UUID


class RatingResponse(RatingBase):
    id: UUID
    order_id: UUID
    user_id: UUID
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
