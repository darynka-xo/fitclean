from sqlalchemy import Column, String, BigInteger, DateTime, Text, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class EmployeeNotification(Base):
    __tablename__ = "employee_notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), nullable=True)  # null for broadcast
    club_id = Column(BigInteger, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=True)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    priority = Column(String(20), default="medium")
    created_at = Column(DateTime, server_default=func.now())
    read_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        CheckConstraint("priority IN ('low', 'medium', 'high', 'urgent')", name="check_priority"),
    )
    
    # Relationships
    club = relationship("Club", back_populates="employee_notifications")
    order = relationship("Order", back_populates="notifications")


class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=True)
    notification_type = Column(String(50), nullable=False)  # order_accepted, order_ready, etc
    channel = Column(String(20), nullable=False)  # telegram, whatsapp
    message = Column(Text, nullable=True)
    telegram_sent = Column(Boolean, default=False)
    whatsapp_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, server_default=func.now())
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    order = relationship("Order")
