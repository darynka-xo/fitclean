from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.order import Order
from ..models.user import User
from ..schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderWithDetails, PickupCodeVerify

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db)
):
    """Create a new order"""
    order = Order(**order_data.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    club_id: Optional[int] = None,
    user_id: Optional[UUID] = None,
    status_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List orders with optional filters"""
    query = db.query(Order)
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    if user_id:
        query = query.filter(Order.user_id == user_id)
    if status_id:
        query = query.filter(Order.status_id == status_id)
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.get("/details", response_model=List[OrderWithDetails])
async def list_orders_with_details(
    club_id: Optional[int] = None,
    status_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List orders with user and status details"""
    query = db.query(Order).options(
        joinedload(Order.user),
        joinedload(Order.club),
        joinedload(Order.status_type)
    )
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    if status_id:
        query = query.filter(Order.status_id == status_id)
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for order in orders:
        order_dict = OrderResponse.model_validate(order).model_dump()
        order_dict["username"] = order.user.username if order.user else None
        order_dict["phone"] = order.user.phone if order.user else None
        order_dict["subscription_type"] = order.user.subscription_type.name if order.user and order.user.subscription_type else None
        order_dict["status_name"] = order.status_type.name if order.status_type else None
        order_dict["status_code"] = order.status_type.code if order.status_type else None
        order_dict["club_name"] = order.club.name if order.club else None
        order_dict["club_code"] = order.club.code if order.club else None
        result.append(OrderWithDetails(**order_dict))
    
    return result


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: UUID, db: Session = Depends(get_db)):
    """Get order by ID"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return order


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: UUID,
    order_data: OrderUpdate,
    db: Session = Depends(get_db)
):
    """Update order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    update_data = order_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    
    db.commit()
    db.refresh(order)
    return order


@router.put("/{order_id}/status/{status_id}", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    status_id: int,
    db: Session = Depends(get_db)
):
    """Update order status"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    order.status_id = status_id
    db.commit()
    db.refresh(order)
    return order


@router.post("/verify-pickup", response_model=OrderResponse)
async def verify_pickup_code(
    verify_data: PickupCodeVerify,
    db: Session = Depends(get_db)
):
    """Verify pickup code and return matching order"""
    query = db.query(Order).filter(
        Order.pickup_code == verify_data.pickup_code,
        Order.status_id == 3  # ready_for_pickup
    )
    
    if verify_data.club_id:
        query = query.filter(Order.club_id == verify_data.club_id)
    
    order = query.first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid pickup code"
        )
    
    return order


@router.get("/user/{user_id}", response_model=List[OrderResponse])
async def get_user_orders(
    user_id: UUID,
    status_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all orders for a user"""
    query = db.query(Order).filter(Order.user_id == user_id)
    
    if status_id:
        query = query.filter(Order.status_id == status_id)
    
    orders = query.order_by(Order.created_at.desc()).all()
    return orders
