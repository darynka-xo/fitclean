from pydantic import BaseModel
from typing import Optional


class StatusTypeResponse(BaseModel):
    id: int
    code: Optional[str] = None
    name: Optional[str] = None
    
    class Config:
        from_attributes = True
