from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    title = Column(String)
    description = Column(Text, default="")
    status = Column(String, default="pending")
    assigned_agent_id = Column(Integer, nullable=True)
    priority = Column(String, default="medium")
    result = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
