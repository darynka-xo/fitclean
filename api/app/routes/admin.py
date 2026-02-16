"""
Admin Panel Routes
Endpoints for admin dashboard and management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.order import Order
from ..models.club import Club
from ..models.subscription import DimSubscriptionType
from ..models.status import DimStatusType
from ..services.supabase_client import supabase_client

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


# ===========================================
# Dashboard Stats
# ===========================================

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    club_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    # Build queries
    orders_query = db.query(Order)
    users_query = db.query(User)
    
    if club_id:
        orders_query = orders_query.filter(Order.club_id == club_id)
        users_query = users_query.filter(User.club_id == club_id)
    
    if date_from:
        orders_query = orders_query.filter(Order.created_date >= date_from)
    
    if date_to:
        orders_query = orders_query.filter(Order.created_date <= date_to)
    
    # Get counts
    total_orders = orders_query.count()
    pending_orders = orders_query.filter(Order.status_id == 1).count()
    in_progress_orders = orders_query.filter(Order.status_id == 2).count()
    ready_orders = orders_query.filter(Order.status_id == 3).count()
    completed_orders = orders_query.filter(Order.status_id == 4).count()
    total_users = users_query.count()
    
    # Calculate revenue
    from sqlalchemy import func
    revenue = orders_query.filter(
        Order.status_id.in_([3, 4])  # Ready or completed
    ).with_entities(func.sum(Order.price)).scalar() or 0
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "in_progress_orders": in_progress_orders,
        "ready_orders": ready_orders,
        "completed_orders": completed_orders,
        "total_users": total_users,
        "total_revenue": float(revenue),
        "period": {
            "from": str(date_from) if date_from else None,
            "to": str(date_to) if date_to else None
        }
    }


@router.get("/dashboard/orders-by-status")
async def get_orders_by_status(
    club_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get orders grouped by status"""
    from sqlalchemy import func
    
    query = db.query(
        Order.status_id,
        func.count(Order.id).label("count")
    ).group_by(Order.status_id)
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    
    results = query.all()
    
    # Get status names
    statuses = db.query(DimStatusType).all()
    status_map = {s.id: s.name for s in statuses}
    
    return [
        {
            "status_id": r.status_id,
            "status_name": status_map.get(r.status_id, "Unknown"),
            "count": r.count
        }
        for r in results
    ]


# ===========================================
# Order Management
# ===========================================

class OrderListItem(BaseModel):
    id: UUID
    order_number: Optional[str]
    user_name: Optional[str]
    user_phone: Optional[str]
    club_name: Optional[str]
    status_id: int
    status_name: Optional[str]
    price: Optional[float]
    created_at: Optional[datetime]


@router.get("/orders", response_model=List[OrderListItem])
async def list_orders_admin(
    club_id: Optional[int] = None,
    status_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List orders for admin panel"""
    query = db.query(Order)
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    
    if status_id:
        query = query.filter(Order.status_id == status_id)
    
    if search:
        # Search by order number or user phone
        query = query.filter(
            (Order.order_number.ilike(f"%{search}%")) |
            (Order.user.has(User.phone.ilike(f"%{search}%")))
        )
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get status names
    statuses = db.query(DimStatusType).all()
    status_map = {s.id: s.name for s in statuses}
    
    return [
        OrderListItem(
            id=order.id,
            order_number=order.order_number,
            user_name=order.user.username if order.user else None,
            user_phone=order.user.phone if order.user else None,
            club_name=order.club.name if order.club else None,
            status_id=order.status_id,
            status_name=status_map.get(order.status_id),
            price=float(order.price) if order.price else None,
            created_at=order.created_at
        )
        for order in orders
    ]


@router.post("/orders/{order_id}/update-status")
async def update_order_status_admin(
    order_id: UUID,
    new_status_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update order status (admin)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    old_status = order.status_id
    order.status_id = new_status_id
    db.commit()
    
    return {
        "success": True,
        "order_id": str(order_id),
        "old_status": old_status,
        "new_status": new_status_id
    }


# ===========================================
# User Management
# ===========================================

class UserListItem(BaseModel):
    id: UUID
    username: Optional[str]
    phone: Optional[str]
    club_id: Optional[int]
    club_name: Optional[str]
    subscription_name: Optional[str]
    orders_count: int
    created_at: Optional[datetime]


@router.get("/users", response_model=List[UserListItem])
async def list_users_admin(
    club_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List users for admin panel"""
    from sqlalchemy import func
    
    # Subquery for order count
    order_count_subq = db.query(
        Order.user_id,
        func.count(Order.id).label("orders_count")
    ).group_by(Order.user_id).subquery()
    
    query = db.query(
        User,
        func.coalesce(order_count_subq.c.orders_count, 0).label("orders_count")
    ).outerjoin(
        order_count_subq, User.id == order_count_subq.c.user_id
    )
    
    if club_id:
        query = query.filter(User.club_id == club_id)
    
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) |
            (User.phone.ilike(f"%{search}%"))
        )
    
    results = query.offset(skip).limit(limit).all()
    
    return [
        UserListItem(
            id=user.id,
            username=user.username,
            phone=user.phone,
            club_id=user.club_id,
            club_name=user.club.name if user.club else None,
            subscription_name=user.subscription_type.name if user.subscription_type else None,
            orders_count=orders_count,
            created_at=user.created_at
        )
        for user, orders_count in results
    ]


# ===========================================
# Clubs Management
# ===========================================

@router.get("/clubs")
async def list_clubs_admin(db: Session = Depends(get_db)):
    """List all clubs"""
    clubs = db.query(Club).all()
    return [
        {
            "id": club.id,
            "code": club.code,
            "name": club.name
        }
        for club in clubs
    ]


# ===========================================
# Subscriptions Management
# ===========================================

@router.get("/subscriptions")
async def list_subscriptions_admin(db: Session = Depends(get_db)):
    """List all subscription types"""
    subs = db.query(DimSubscriptionType).all()
    return [
        {
            "id": sub.id,
            "code": sub.code,
            "name": sub.name,
            "price": float(sub.price) if sub.price else None
        }
        for sub in subs
    ]


# ===========================================
# Status Types
# ===========================================

@router.get("/statuses")
async def list_statuses_admin(db: Session = Depends(get_db)):
    """List all status types"""
    statuses = db.query(DimStatusType).all()
    return [
        {
            "id": s.id,
            "code": s.code,
            "name": s.name
        }
        for s in statuses
    ]


# ===========================================
# Reports (using Supabase client for production data)
# ===========================================

@router.get("/reports/orders-summary")
async def get_orders_summary_from_supabase():
    """Get orders summary from production Supabase"""
    orders = await supabase_client.get_orders()
    statuses = await supabase_client.get_statuses()
    
    status_map = {s["id"]: s["name"] for s in statuses}
    
    # Group by status
    summary = {}
    for order in orders:
        status_name = status_map.get(order["status_id"], "Unknown")
        if status_name not in summary:
            summary[status_name] = {"count": 0, "total_revenue": 0}
        summary[status_name]["count"] += 1
        summary[status_name]["total_revenue"] += order.get("price", 0) or 0
    
    return {
        "total_orders": len(orders),
        "by_status": summary,
        "source": "production_supabase"
    }
