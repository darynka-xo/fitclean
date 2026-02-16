from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text
import uuid
from ..core.database import Base


class InviteLink(Base):
    __tablename__ = "invite_links"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(BigInteger, ForeignKey("clubs.id"), nullable=False)
    role = Column(String, default="reception", nullable=False)
    expires_at = Column(DateTime, server_default=text("now() + interval '24 hours'"))
    used_at = Column(DateTime, nullable=True)
    
    # Relationships
    club = relationship("Club", back_populates="invite_links")
