from sqlalchemy import Column, Integer, String, Text, Float, DateTime, func, ForeignKey
from database import Base


class WorkspaceMemory(Base):
    __tablename__ = "workspace_memory"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    memory_type = Column(String, default="general")
    source = Column(String, default="")
    title = Column(String, default="")
    content = Column(Text)
    importance_score = Column(Float, default=1.0)
    created_at = Column(DateTime, server_default=func.now())


class GlobalMemory(Base):
    __tablename__ = "global_memory"

    id = Column(Integer, primary_key=True, index=True)
    memory_type = Column(String, default="general")
    title = Column(String, default="")
    content = Column(Text)
    importance_score = Column(Float, default=1.0)
    created_at = Column(DateTime, server_default=func.now())
