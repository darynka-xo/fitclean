from sqlalchemy import Column, String, BigInteger, Integer, Float, DateTime, Boolean, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    price = Column(Float, nullable=True)
    package_id = Column(String, nullable=True)
    club_id = Column(BigInteger, ForeignKey("clubs.id"), nullable=True)
    receipt_url = Column(String, nullable=True)
    status_id = Column(Integer, ForeignKey("dim_status_types.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # High priority features
    pickup_code = Column(String(4), nullable=True)
    is_tariff_based = Column(Boolean, default=False)
    tariff_price = Column(Float, nullable=True)
    
    # Medium priority features
    order_number = Column(String(20), nullable=True)
    daily_sequence = Column(Integer, nullable=True)
    created_date = Column(Date, server_default=func.current_date())
    
    # Locker integration
    locker_device_id = Column(String(100), nullable=True)
    locker_cell_id = Column(String(100), nullable=True)
    locker_cell_number = Column(Integer, nullable=True)
    
    # Comment/notes
    comment = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="orders")
    club = relationship("Club", back_populates="orders")
    status_type = relationship("DimStatusType", back_populates="orders")
    ratings = relationship("ClientRating", back_populates="order")
    photos = relationship("OrderPhoto", back_populates="order")
    notifications = relationship("EmployeeNotification", back_populates="order")
