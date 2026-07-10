from sqlalchemy import Column, Integer, String, Text, DateTime, func
from database import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, default="")
    category = Column(String, default="General")
    icon = Column(String, default="Briefcase")
    tags = Column(Text, default="")
    default_model = Column(String, default="")
    default_agent_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
