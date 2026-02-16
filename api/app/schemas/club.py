from pydantic import BaseModel
from typing import Optional


class ClubBase(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None


class ClubCreate(ClubBase):
    pass


class ClubUpdate(ClubBase):
    pass


class ClubResponse(ClubBase):
    id: int
    
    class Config:
        from_attributes = True
