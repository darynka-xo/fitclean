from sqlalchemy import Column, String, BigInteger, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    chat_id = Column(BigInteger, nullable=True)
    club_id = Column(BigInteger, ForeignKey("clubs.id"), nullable=True)
    subscription_id = Column(Integer, ForeignKey("dim_subscription_types.id"), nullable=True)
    subscription_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Additional fields from migrations
    face_id_data = Column(String, nullable=True)  # Encrypted Face ID data
    pin_code = Column(String, nullable=True)  # Hashed PIN code
    pin_set_at = Column(DateTime, nullable=True)
    notify_on_status_change = Column(Boolean, default=True)
    notify_on_pickup_ready = Column(Boolean, default=True)
    bag_number = Column(String(50), nullable=True)
    role = Column(String(20), default='client')
    
    # Relationships
    club = relationship("Club", back_populates="users")
    subscription_type = relationship("DimSubscriptionType", back_populates="users")
    orders = relationship("Order", back_populates="user")
    ratings = relationship("ClientRating", back_populates="user")
