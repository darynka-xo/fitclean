from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.subscription import DimSubscriptionType
from ..schemas.subscription import SubscriptionTypeResponse

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/", response_model=List[SubscriptionTypeResponse])
async def list_subscriptions(db: Session = Depends(get_db)):
    """List all subscription types"""
    subscriptions = db.query(DimSubscriptionType).all()
    return subscriptions


@router.get("/{subscription_id}", response_model=SubscriptionTypeResponse)
async def get_subscription(subscription_id: int, db: Session = Depends(get_db)):
    """Get subscription type by ID"""
    subscription = db.query(DimSubscriptionType).filter(
        DimSubscriptionType.id == subscription_id
    ).first()
    return subscription
