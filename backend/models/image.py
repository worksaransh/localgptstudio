from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from database import Base


class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    prompt = Column(Text)
    negative_prompt = Column(Text, nullable=True)
    model = Column(String, default="")
    filepath = Column(String)
    image_type = Column(String, default="text_to_image")
    width = Column(Integer, default=1024)
    height = Column(Integer, default=1024)
    created_at = Column(DateTime, server_default=func.now())
