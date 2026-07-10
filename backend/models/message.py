from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), index=True)
    role = Column(String)
    content = Column(Text)
    sources = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
