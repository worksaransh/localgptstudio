from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), index=True)
    filename = Column(String)
    filepath = Column(String)
    file_type = Column(String)
    content = Column(Text, nullable=True)
    doc_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
