from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    asset_type = Column(String, default="document")
    name = Column(String)
    description = Column(Text, default="")
    filepath = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    source = Column(String, default="")
    created_at = Column(DateTime, server_default=func.now())
