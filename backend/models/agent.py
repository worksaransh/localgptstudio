from sqlalchemy import Column, Integer, String, Float, Text, DateTime, func, ForeignKey
from database import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    name = Column(String, index=True)
    description = Column(Text, default="")
    model = Column(String, default="")
    system_prompt = Column(Text, default="")
    knowledge_base = Column(Text, nullable=True)
    temperature = Column(Float, default=0.7)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
