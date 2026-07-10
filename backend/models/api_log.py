from sqlalchemy import Column, Integer, String, Float, DateTime, func, Text
from database import Base


class ApiLog(Base):
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String)
    method = Column(String)
    tokens_used = Column(Integer, default=0)
    duration_ms = Column(Float, default=0)
    status_code = Column(Integer)
    request_data = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
