"""
Laundry Staff Routes
Endpoints for laundry processing workflow:
- Receiving dirty items (with photo confirmation)
- Marking items as washed
- Packing clean items
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.order import Order
from ..models.photo import OrderPhoto
from ..models.user import User
from ..services.whatsapp import whatsapp_service

router = APIRouter(prefix="/laundry", tags=["Laundry Staff"])


# ===========================================
# Order Status IDs (matching database)
# ===========================================
STATUS_PENDING = 1          # Ожидание оплаты
STATUS_IN_PROGRESS = 2      # Выполняется (in laundry)
STATUS_READY_FOR_PICKUP = 3 # Ждет получателя
STATUS_COMPLETED = 4        # Завершен
STATUS_CANCELED = 5         # Отменен

# Custom laundry statuses (sub-statuses of IN_PROGRESS)
LAUNDRY_STATUS_RECEIVED = "received"      # Received at laundry
LAUNDRY_STATUS_WASHING = "washing"        # Currently washing
LAUNDRY_STATUS_WASHED = "washed"          # Washed, ready for packing
LAUNDRY_STATUS_PACKED = "packed"          # Packed, ready for delivery


# ===========================================
# Pydantic Models
# ===========================================

class ReceiveItemRequest(BaseModel):
    order_id: UUID
    photo_url: str
    bag_number: str
    notes: Optional[str] = None


class MarkWashedRequest(BaseModel):
    order_id: UUID
    notes: Optional[str] = None


class PackItemRequest(BaseModel):
    order_id: UUID
    photo_url: Optional[str] = None
    notes: Optional[str] = None


class OrderListResponse(BaseModel):
    id: UUID
    order_number: Optional[str]
    package_id: Optional[str]
    status_id: int
    laundry_status: Optional[str]
    club_name: Optional[str]
    user_phone: Optional[str]
    created_at: Optional[datetime]
    received_photo_url: Optional[str]


# ===========================================
# Routes
# ===========================================

@router.get("/orders/pending-receipt", response_model=List[OrderListResponse])
async def get_orders_pending_receipt(
    club_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get orders waiting to be received at laundry
    These are orders with status IN_PROGRESS but not yet received
    """
    query = db.query(Order).filter(
        Order.status_id == STATUS_IN_PROGRESS
    )
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    
    orders = query.order_by(Order.created_at).all()
    
    result = []
    for order in orders:
        # Check if already received (has received photo)
        received_photo = db.query(OrderPhoto).filter(
            OrderPhoto.order_id == order.id,
            OrderPhoto.photo_type == "received"
        ).first()
        
        if not received_photo:  # Only include orders not yet received
            result.append(OrderListResponse(
                id=order.id,
                order_number=order.order_number,
                package_id=order.package_id,
                status_id=order.status_id,
                laundry_status=None,
                club_name=order.club.name if order.club else None,
                user_phone=order.user.phone if order.user else None,
                created_at=order.created_at,
                received_photo_url=None
            ))
    
    return result


@router.get("/orders/in-washing", response_model=List[OrderListResponse])
async def get_orders_in_washing(
    club_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get orders currently being washed
    """
    query = db.query(Order).filter(
        Order.status_id == STATUS_IN_PROGRESS
    )
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    
    orders = query.order_by(Order.created_at).all()
    
    result = []
    for order in orders:
        # Check if received but not yet washed
        received_photo = db.query(OrderPhoto).filter(
            OrderPhoto.order_id == order.id,
            OrderPhoto.photo_type == "received"
        ).first()
        
        processed_photo = db.query(OrderPhoto).filter(
            OrderPhoto.order_id == order.id,
            OrderPhoto.photo_type == "processed"
        ).first()
        
        if received_photo and not processed_photo:
            result.append(OrderListResponse(
                id=order.id,
                order_number=order.order_number,
                package_id=order.package_id,
                status_id=order.status_id,
                laundry_status=LAUNDRY_STATUS_WASHING,
                club_name=order.club.name if order.club else None,
                user_phone=order.user.phone if order.user else None,
                created_at=order.created_at,
                received_photo_url=received_photo.photo_url
            ))
    
    return result


@router.get("/orders/ready-to-pack", response_model=List[OrderListResponse])
async def get_orders_ready_to_pack(
    club_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get orders that are washed and ready for packing
    """
    query = db.query(Order).filter(
        Order.status_id == STATUS_IN_PROGRESS
    )
    
    if club_id:
        query = query.filter(Order.club_id == club_id)
    
    orders = query.order_by(Order.created_at).all()
    
    result = []
    for order in orders:
        # Check if washed but not yet packed
        processed_photo = db.query(OrderPhoto).filter(
            OrderPhoto.order_id == order.id,
            OrderPhoto.photo_type == "processed"
        ).first()
        
        ready_photo = db.query(OrderPhoto).filter(
            OrderPhoto.order_id == order.id,
            OrderPhoto.photo_type == "ready"
        ).first()
        
        received_photo = db.query(OrderPhoto).filter(
            OrderPhoto.order_id == order.id,
            OrderPhoto.photo_type == "received"
        ).first()
        
        if processed_photo and not ready_photo:
            result.append(OrderListResponse(
                id=order.id,
                order_number=order.order_number,
                package_id=order.package_id,
                status_id=order.status_id,
                laundry_status=LAUNDRY_STATUS_WASHED,
                club_name=order.club.name if order.club else None,
                user_phone=order.user.phone if order.user else None,
                created_at=order.created_at,
                received_photo_url=received_photo.photo_url if received_photo else None
            ))
    
    return result


@router.post("/receive-item")
async def receive_item_at_laundry(
    request: ReceiveItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Receive dirty items at laundry
    1. Take photo of items with visible bag number
    2. Confirm receipt
    3. System notifies customer via WhatsApp
    """
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if already received
    existing = db.query(OrderPhoto).filter(
        OrderPhoto.order_id == request.order_id,
        OrderPhoto.photo_type == "received"
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order already received at laundry"
        )
    
    # Save photo
    photo = OrderPhoto(
        order_id=request.order_id,
        uploaded_by=current_user.id,
        photo_url=request.photo_url,
        photo_type="received",
        description=f"Bag: {request.bag_number}. {request.notes or ''}"
    )
    db.add(photo)
    
    # Update order bag number if provided
    if request.bag_number:
        order.package_id = request.bag_number
    
    db.commit()
    
    # Send WhatsApp notification to customer
    if order.user and order.user.phone:
        await whatsapp_service.notify_items_received_at_laundry(
            phone=order.user.phone,
            order_number=order.order_number or str(order.id)[:8],
            bag_number=request.bag_number
        )
    
    return {
        "success": True,
        "message": "Item received at laundry",
        "order_id": str(order.id),
        "bag_number": request.bag_number
    }


@router.post("/mark-washed")
async def mark_item_washed(
    request: MarkWashedRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark item as washed
    1. Select order/bag
    2. Mark as washed
    3. System notifies customer via WhatsApp
    """
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Save "processed" photo record
    photo = OrderPhoto(
        order_id=request.order_id,
        uploaded_by=current_user.id,
        photo_url=f"https://placehold.co/400x300/22c55e/ffffff?text=Постирано",
        photo_type="processed",
        description=f"Постирано. {request.notes or ''}"
    )
    db.add(photo)
    db.commit()
    
    # Send WhatsApp notification to customer
    if order.user and order.user.phone:
        await whatsapp_service.notify_items_washed(
            phone=order.user.phone,
            order_number=order.order_number or str(order.id)[:8]
        )
    
    return {
        "success": True,
        "message": "Item marked as washed",
        "order_id": str(order.id)
    }


@router.post("/pack-item")
async def pack_item(
    request: PackItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Pack clean item for delivery
    1. Compare with received photo
    2. Pack in bag with same number
    3. Mark as packed and ready for delivery
    """
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Get received photo for comparison
    received_photo = db.query(OrderPhoto).filter(
        OrderPhoto.order_id == request.order_id,
        OrderPhoto.photo_type == "received"
    ).first()
    
    # Save "ready" photo
    photo = OrderPhoto(
        order_id=request.order_id,
        uploaded_by=current_user.id,
        photo_url=request.photo_url or f"https://placehold.co/400x300/3b82f6/ffffff?text=Упаковано",
        photo_type="ready",
        description=f"Упаковано и готово к доставке. {request.notes or ''}"
    )
    db.add(photo)
    db.commit()
    
    return {
        "success": True,
        "message": "Item packed and ready for delivery",
        "order_id": str(order.id),
        "bag_number": order.package_id,
        "received_photo_url": received_photo.photo_url if received_photo else None
    }


@router.get("/orders/{order_id}/photos")
async def get_order_photos(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Get all photos for an order (for comparison during packing)"""
    photos = db.query(OrderPhoto).filter(
        OrderPhoto.order_id == order_id
    ).order_by(OrderPhoto.created_at).all()
    
    result = {
        "received": None,
        "processed": None,
        "ready": None
    }
    
    for photo in photos:
        result[photo.photo_type] = {
            "url": photo.photo_url,
            "description": photo.description,
            "created_at": photo.created_at
        }
    
    return result


@router.post("/report-issue")
async def report_item_issue(
    order_id: UUID,
    issue_type: str,  # missing_item, damaged, stain_not_removed
    description: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Report an issue with an order (e.g., missing item, damage)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Save issue photo/note
    photo = OrderPhoto(
        order_id=order_id,
        uploaded_by=current_user.id,
        photo_url=f"https://placehold.co/400x300/ef4444/ffffff?text=Проблема",
        photo_type="received",  # Attach to received stage
        description=f"ПРОБЛЕМА: {issue_type} - {description}"
    )
    db.add(photo)
    db.commit()
    
    # Notify admin about issue
    if order.user:
        await whatsapp_service.notify_admin_issue(
            admin_phone="+77072331465",  # Admin phone
            client_name=order.user.username or "Unknown",
            client_phone=order.user.phone or "Unknown",
            order_number=order.order_number or str(order.id)[:8],
            issue_description=f"{issue_type}: {description}"
        )
    
    return {
        "success": True,
        "message": "Issue reported",
        "order_id": str(order.id)
    }
