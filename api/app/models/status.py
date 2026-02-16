from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..core.database import Base


class DimStatusType(Base):
    __tablename__ = "dim_status_types"
    
    id = Column(Integer, primary_key=True)
    code = Column(String, nullable=True)
    name = Column(String, nullable=True)
    
    # Relationships
    orders = relationship("Order", back_populates="status_type")
