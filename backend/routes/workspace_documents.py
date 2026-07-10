import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.document import Document
from models.collection import Collection
from models.memory import WorkspaceMemory
from services.chroma_service import ChromaService
from services.document_processor import DocumentProcessor
from services import LMStudioService
from services.memory_service import MemoryService
from config import UPLOAD_DIR

router = APIRouter(prefix="/api/workspaces/{workspace_id}/documents", tags=["Workspace Documents"])
chroma = ChromaService()
doc_processor = DocumentProcessor()
lm_studio = LMStudioService()
mem_service = MemoryService(lm_studio)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv", ".txt", ".md"}


@router.get("")
def list_documents(workspace_id: int, db: Session = Depends(get_db)):
    return {"documents": db.query(Document).filter(Document.workspace_id == workspace_id).all()}


@router.post("/upload")
async def upload_document(workspace_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{ext}"
    filepath = UPLOAD_DIR / safe_name

    content_bytes = await file.read()
    with open(filepath, "wb") as f:
        f.write(content_bytes)

    text, chunks = doc_processor.process(str(filepath))

    doc = Document(
        workspace_id=workspace_id,
        filename=file.filename,
        filepath=str(filepath),
        file_type=ext,
        content=text,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Index in ChromaDB
    if chunks:
        embeddings = await lm_studio.embeddings(chunks)
        if embeddings:
            chroma.add_documents(
                collection_name=f"ws_{workspace_id}",
                documents=chunks,
                metadatas=[{"document_id": doc.id, "filename": file.filename} for _ in chunks],
                ids=[f"doc_{doc.id}_{i}" for i in range(len(chunks))],
            )

    # Auto-extract memory
    if text:
        try:
            entries = await mem_service.extract_memory(text[:5000], source=file.filename)
            for entry in entries:
                mem = WorkspaceMemory(
                    workspace_id=workspace_id,
                    title=entry.get("title", "")[:200],
                    content=entry.get("content", ""),
                    memory_type=entry.get("memory_type", "general"),
                    source=entry.get("source", file.filename),
                    importance_score=entry.get("importance_score", 1.0),
                )
                db.add(mem)
            db.commit()
        except Exception:
            pass

    return {"document": doc, "chunks": len(chunks), "memory_extracted": True}


@router.delete("/{document_id}")
def delete_document(workspace_id: int, document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id, Document.workspace_id == workspace_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)
    db.delete(doc)
    db.commit()
    return {"ok": True}
