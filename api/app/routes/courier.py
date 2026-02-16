"""
Courier Routes
Endpoints for courier operations:
- Pickup dirty items from lockers
- Deliver clean items to lockers
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from ..core.database import get_db
from ..models.order import Order
from ..models.club import Club
from ..services.whatsapp import whatsapp_service

router = APIRouter(prefix="/courier", tags=["Courier"])


# ===========================================
# Order Status IDs
# ===========================================
STATUS_PENDING = 1          # Waiting for pickup by courier
STATUS_IN_PROGRESS = 2      # In transit or at laundry
STATUS_READY_FOR_PICKUP = 3 # In locker, ready for customer
STATUS_COMPLETED = 4        # Customer picked up
STATUS_CANCELED = 5         # Canceled


# ===========================================
# Pydantic Models
# ===========================================

class PickupDirtyRequest(BaseModel):
    """Request to record pickup of dirty items from locker"""
    order_id: UUID
    courier_bag_number: Optional[str] = None  # Courier's bag number for tracking
    locker_cell_id: Optional[str] = None      # Which cell was items picked from
    notes: Optional[str] = None


class DeliverCleanRequest(BaseModel):
    """Request to record delivery of clean items to locker"""
    order_id: UUID
    locker_cell_id: Optional[str] = None      # Which cell items were placed in
    notes: Optional[str] = None


class CourierVisitSummary(BaseModel):
    """Summary of courier visit"""
    club_id: int
    club_name: str
    dirty_picked_up: int
    clean_delivered: int
    issues: List[str]


class OrderForCourier(BaseModel):
    """Order info for courier view"""
    id: UUID
    order_number: Optional[str]
    package_id: Optional[str]  # Bag number
    locker_cell_id: Optional[str]
    status_id: int
    user_phone: Optional[str]
    club_id: Optional[int]
    club_name: Optional[str]
    created_at: Optional[datetime]


# ===========================================
# Routes - Pickup Dirty Items
# ===========================================

@router.get("/dirty-items", response_model=List[OrderForCourier])
async def get_orders_for_pickup(
    club_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of orders with dirty items ready for courier pickup
    These are orders in PENDING status with locker cell assigned
    """
    query = db.query(Order).filter(
        Order.status_id == STATUS_PENDING,
        Order.locker_cell_id.isnot(None)  # Has locker cell assigned
    )
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    
    orders = query.order_by(Order.created_at).all()
    
    return [
        OrderForCourier(
            id=order.id,
            order_number=order.order_number,
            package_id=order.package_id,
            locker_cell_id=order.locker_cell_id,
            status_id=order.status_id,
            user_phone=order.user.phone if order.user else None,
            club_id=order.club_id,
            club_name=order.club.name if order.club else None,
            created_at=order.created_at
        )
        for order in orders
    ]


@router.post("/pickup-dirty")
async def record_dirty_pickup(
    request: PickupDirtyRequest,
    db: Session = Depends(get_db)
):
    """
    Record pickup of dirty items from locker
    
    Flow:
    1. Courier enters their bag number
    2. System opens locker cell
    3. Courier takes items from cell, puts in their bag
    4. Cell is closed
    5. System updates order status to IN_PROGRESS
    
    Note: Actual locker opening is handled by tablet app.
    This endpoint just records the pickup in the database.
    """
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status_id != STATUS_PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is not in pending status (current: {order.status_id})"
        )
    
    # Update order with courier bag number and status
    if request.courier_bag_number:
        order.package_id = request.courier_bag_number  # Track by courier bag
    order.status_id = STATUS_IN_PROGRESS
    
    # Clear locker cell (item is now with courier)
    original_cell = order.locker_cell_id
    order.locker_cell_id = None
    
    db.commit()
    
    return {
        "success": True,
        "message": "Dirty items picked up",
        "order_id": str(order.id),
        "courier_bag_number": request.courier_bag_number,
        "picked_from_cell": original_cell,
        "new_status": "in_progress"
    }


# ===========================================
# Routes - Deliver Clean Items
# ===========================================

@router.get("/clean-items", response_model=List[OrderForCourier])
async def get_orders_for_delivery(
    club_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of orders with clean items ready for locker delivery
    These are orders in IN_PROGRESS status that have been packed
    (have 'ready' photo type)
    """
    from ..models.photo import OrderPhoto
    
    query = db.query(Order).filter(
        Order.status_id == STATUS_IN_PROGRESS
    )
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    
    orders = query.order_by(Order.created_at).all()
    
    result = []
    for order in orders:
        # Check if order has been packed (has 'ready' photo)
        ready_photo = db.query(OrderPhoto).filter(
            OrderPhoto.order_id == order.id,
            OrderPhoto.photo_type == "ready"
        ).first()
        
        if ready_photo:
            result.append(OrderForCourier(
                id=order.id,
                order_number=order.order_number,
                package_id=order.package_id,
                locker_cell_id=order.locker_cell_id,
                status_id=order.status_id,
                user_phone=order.user.phone if order.user else None,
                club_id=order.club_id,
                club_name=order.club.name if order.club else None,
                created_at=order.created_at
            ))
    
    return result


@router.post("/deliver-clean")
async def record_clean_delivery(
    request: DeliverCleanRequest,
    db: Session = Depends(get_db)
):
    """
    Record delivery of clean items to locker
    
    Flow:
    1. Courier enters/scans bag number (package_id)
    2. System opens an available locker cell
    3. Courier puts clean items in cell
    4. Cell is closed
    5. System updates order status to READY_FOR_PICKUP
    6. Customer receives WhatsApp notification
    
    Note: Actual locker opening is handled by tablet app.
    This endpoint just records the delivery and sends notification.
    """
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status_id != STATUS_IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is not in progress status (current: {order.status_id})"
        )
    
    # Update order with locker cell and status
    if request.locker_cell_id:
        order.locker_cell_id = request.locker_cell_id
    order.status_id = STATUS_READY_FOR_PICKUP
    
    db.commit()
    
    # Send WhatsApp notification to customer
    club_name = order.club.name if order.club else "FitClean"
    notification_sent = False
    if order.user and order.user.phone:
        try:
            await whatsapp_service.notify_ready_for_pickup(
                phone=order.user.phone,
                order_number=order.order_number or str(order.id)[:8],
                club_name=club_name,
                cell_number=request.locker_cell_id or "N/A"
            )
            notification_sent = True
        except Exception:
            pass
    
    return {
        "success": True,
        "message": "Clean items delivered to locker",
        "order_id": str(order.id),
        "locker_cell_id": request.locker_cell_id,
        "new_status": "ready_for_pickup",
        "notification_sent": notification_sent
    }


# ===========================================
# Routes - Visit Management
# ===========================================

@router.post("/start-visit/{club_id}")
async def start_courier_visit(
    club_id: int,
    db: Session = Depends(get_db)
):
    """Start a courier visit at a club"""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    # Get counts of orders for this visit
    dirty_count = db.query(Order).filter(
        Order.club_id == club_id,
        Order.status_id == STATUS_PENDING,
        Order.locker_cell_id.isnot(None)
    ).count()
    
    from ..models.photo import OrderPhoto
    clean_orders = db.query(Order).filter(
        Order.club_id == club_id,
        Order.status_id == STATUS_IN_PROGRESS
    ).all()
    
    clean_count = 0
    for order in clean_orders:
        ready_photo = db.query(OrderPhoto).filter(
            OrderPhoto.order_id == order.id,
            OrderPhoto.photo_type == "ready"
        ).first()
        if ready_photo:
            clean_count += 1
    
    return {
        "success": True,
        "club_id": club_id,
        "club_name": club.name,
        "dirty_items_to_pickup": dirty_count,
        "clean_items_to_deliver": clean_count,
        "visit_started_at": datetime.utcnow().isoformat()
    }


@router.post("/end-visit/{club_id}")
async def end_courier_visit(
    club_id: int,
    dirty_picked: int = 0,
    clean_delivered: int = 0,
    issues: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    """End courier visit with summary"""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    return CourierVisitSummary(
        club_id=club_id,
        club_name=club.name,
        dirty_picked_up=dirty_picked,
        clean_delivered=clean_delivered,
        issues=issues or []
    )


@router.post("/report-cell-issue")
async def report_cell_issue(
    club_id: int,
    cell_id: str,
    issue_type: str,  # stuck, not_opening, damaged
    description: str,
    db: Session = Depends(get_db)
):
    """Report an issue with a locker cell"""
    # Notify admin about cell issue
    try:
        await whatsapp_service.notify_admin_issue(
            admin_phone="+77072331465",  # Admin phone
            client_name="Courier",
            client_phone="Unknown",
            order_number=f"CELL-{cell_id}",
            issue_description=f"Club {club_id}, Cell {cell_id}: {issue_type} - {description}"
        )
    except Exception:
        pass
    
    return {
        "success": True,
        "message": "Issue reported to admin",
        "cell_id": cell_id,
        "issue_type": issue_type
    }
