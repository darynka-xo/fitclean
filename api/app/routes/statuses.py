from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.status import DimStatusType
from ..schemas.status import StatusTypeResponse

router = APIRouter(prefix="/statuses", tags=["Statuses"])


@router.get("/", response_model=List[StatusTypeResponse])
async def list_statuses(db: Session = Depends(get_db)):
    """List all status types"""
    statuses = db.query(DimStatusType).all()
    return statuses


@router.get("/{status_id}", response_model=StatusTypeResponse)
async def get_status(status_id: int, db: Session = Depends(get_db)):
    """Get status type by ID"""
    status = db.query(DimStatusType).filter(
        DimStatusType.id == status_id
    ).first()
    return status
