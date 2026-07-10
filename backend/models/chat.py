from sqlalchemy import Column, Integer, String, Float, DateTime, func, ForeignKey
from database import Base


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    title = Column(String, default="New Chat")
    model = Column(String, default="")
    system_prompt = Column(String, default="")
    context_length = Column(Integer, default=8192)
    temperature = Column(Float, default=0.7)
    top_p = Column(Float, default=0.95)
    max_tokens = Column(Integer, default=4096)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
