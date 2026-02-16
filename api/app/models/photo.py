from sqlalchemy import Column, String, DateTime, Text, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class OrderPhoto(Base):
    __tablename__ = "order_photos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), nullable=False)  # Staff member who uploaded
    photo_url = Column(Text, nullable=False)
    photo_type = Column(String(20), default="received")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("photo_type IN ('received', 'processed', 'ready')", name="check_photo_type"),
    )
    
    # Relationships
    order = relationship("Order", back_populates="photos")
