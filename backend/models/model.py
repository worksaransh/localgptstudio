from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database import Base


class Model(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String, unique=True, index=True)
    name = Column(String)
    owned_by = Column(String, default="local")
    is_vision = Column(Boolean, default=False)
    is_embedding = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
