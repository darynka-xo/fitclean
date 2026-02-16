from pydantic import BaseModel
from typing import Optional


class SubscriptionTypeResponse(BaseModel):
    id: int
    code: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    
    class Config:
        from_attributes = True
