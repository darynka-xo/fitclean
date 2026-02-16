from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.club import Club
from ..schemas.club import ClubCreate, ClubUpdate, ClubResponse

router = APIRouter(prefix="/clubs", tags=["Clubs"])


@router.post("/", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
async def create_club(club_data: ClubCreate, db: Session = Depends(get_db)):
    """Create a new club"""
    club = Club(**club_data.model_dump())
    db.add(club)
    db.commit()
    db.refresh(club)
    return club


@router.get("/", response_model=List[ClubResponse])
async def list_clubs(db: Session = Depends(get_db)):
    """List all clubs"""
    clubs = db.query(Club).all()
    return clubs


@router.get("/{club_id}", response_model=ClubResponse)
async def get_club(club_id: int, db: Session = Depends(get_db)):
    """Get club by ID"""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    return club


@router.put("/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: int,
    club_data: ClubUpdate,
    db: Session = Depends(get_db)
):
    """Update club"""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    update_data = club_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(club, field, value)
    
    db.commit()
    db.refresh(club)
    return club


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_club(club_id: int, db: Session = Depends(get_db)):
    """Delete club"""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    db.delete(club)
    db.commit()
    return None


@router.get("/code/{code}", response_model=ClubResponse)
async def get_club_by_code(code: str, db: Session = Depends(get_db)):
    """Get club by code"""
    club = db.query(Club).filter(Club.code == code).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    return club
