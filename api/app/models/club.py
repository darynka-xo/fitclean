from sqlalchemy import Column, BigInteger, String
from sqlalchemy.orm import relationship
from ..core.database import Base


class Club(Base):
    __tablename__ = "clubs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String, nullable=True)
    name = Column(String, nullable=True)
    
    # Relationships
    users = relationship("User", back_populates="club")
    orders = relationship("Order", back_populates="club")
    employee_notifications = relationship("EmployeeNotification", back_populates="club")
    invite_links = relationship("InviteLink", back_populates="club")
