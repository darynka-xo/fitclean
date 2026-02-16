from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from ..core.database import Base


class DimSubscriptionType(Base):
    __tablename__ = "dim_subscription_types"
    
    id = Column(Integer, primary_key=True)
    code = Column(String, nullable=True)
    name = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    
    # Relationships
    users = relationship("User", back_populates="subscription_type")
