from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.photo import OrderPhoto
from ..models.user import User
from ..schemas.photo import PhotoCreate, PhotoResponse

router = APIRouter(prefix="/photos", tags=["Photos"])


@router.get("/", response_model=List[PhotoResponse])
async def list_photos(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all photos"""
    photos = db.query(OrderPhoto).order_by(OrderPhoto.created_at.desc()).offset(skip).limit(limit).all()
    return photos


@router.post("/", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def create_photo(
    photo_data: PhotoCreate,
    db: Session = Depends(get_db)
):
    """Upload a new order photo (no auth required for admin panel)"""
    # Use provided uploaded_by or default admin user
    uploader_id = photo_data.uploaded_by
    if not uploader_id:
        # Default to admin user
        from uuid import UUID as UUIDType
        uploader_id = UUIDType("60e2101b-10ec-441d-894d-b64ea000a79e")
    
    photo = OrderPhoto(
        order_id=photo_data.order_id,
        uploaded_by=uploader_id,
        photo_url=photo_data.photo_url,
        photo_type=photo_data.photo_type,
        description=photo_data.description
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.get("/order/{order_id}", response_model=List[PhotoResponse])
async def get_order_photos(
    order_id: UUID,
    photo_type: str = None,
    db: Session = Depends(get_db)
):
    """Get all photos for an order"""
    query = db.query(OrderPhoto).filter(OrderPhoto.order_id == order_id)
    
    if photo_type:
        query = query.filter(OrderPhoto.photo_type == photo_type)
    
    photos = query.order_by(OrderPhoto.created_at.desc()).all()
    return photos


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: UUID, db: Session = Depends(get_db)):
    """Get photo by ID"""
    photo = db.query(OrderPhoto).filter(OrderPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    return photo


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a photo"""
    photo = db.query(OrderPhoto).filter(OrderPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    db.delete(photo)
    db.commit()
    return None
