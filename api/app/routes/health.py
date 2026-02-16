from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..core.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "service": "FitClean API"}


@router.get("/health/db")
async def database_health(db: Session = Depends(get_db)):
    """Database connection health check"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
