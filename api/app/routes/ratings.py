from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.rating import ClientRating
from ..models.user import User
from ..schemas.rating import RatingCreate, RatingResponse

router = APIRouter(prefix="/ratings", tags=["Ratings"])


@router.get("/", response_model=List[RatingResponse])
async def list_ratings(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all ratings"""
    ratings = db.query(ClientRating).order_by(ClientRating.created_at.desc()).offset(skip).limit(limit).all()
    return ratings


@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(
    rating_data: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new rating for an order"""
    # Check if rating already exists for this order and user
    existing = db.query(ClientRating).filter(
        ClientRating.order_id == rating_data.order_id,
        ClientRating.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already rated this order"
        )
    
    rating = ClientRating(
        order_id=rating_data.order_id,
        user_id=current_user.id,
        rating=rating_data.rating,
        comment=rating_data.comment
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


@router.get("/order/{order_id}", response_model=Optional[RatingResponse])
async def get_order_rating(order_id: UUID, db: Session = Depends(get_db)):
    """Get rating for an order"""
    rating = db.query(ClientRating).filter(
        ClientRating.order_id == order_id
    ).first()
    return rating


@router.get("/user/{user_id}", response_model=List[RatingResponse])
async def get_user_ratings(user_id: UUID, db: Session = Depends(get_db)):
    """Get all ratings by a user"""
    ratings = db.query(ClientRating).filter(
        ClientRating.user_id == user_id
    ).all()
    return ratings


@router.get("/average/{user_id}")
async def get_user_average_rating(user_id: UUID, db: Session = Depends(get_db)):
    """Get average rating for a user"""
    from sqlalchemy import func
    
    result = db.query(
        func.avg(ClientRating.rating).label("average"),
        func.count(ClientRating.id).label("count")
    ).filter(ClientRating.user_id == user_id).first()
    
    return {
        "user_id": user_id,
        "average_rating": float(result.average) if result.average else None,
        "total_ratings": result.count
    }
