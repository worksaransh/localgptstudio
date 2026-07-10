import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.document import Document
from models.collection import Collection
from services.chroma_service import ChromaService
from services.document_processor import DocumentProcessor
from services import LMStudioService
from config import UPLOAD_DIR

router = APIRouter(prefix="/api/documents", tags=["Documents"])
chroma = ChromaService()
doc_processor = DocumentProcessor()
lm_studio = LMStudioService()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv", ".txt"}


@router.get("")
def list_documents(collection_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Document)
    if collection_id:
        query = query.filter(Document.collection_id == collection_id)
    return {"documents": query.all()}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    collection_id: int = Form(...),
    db: Session = Depends(get_db),
):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(404, "Collection not found")

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
        collection_id=collection_id,
        filename=file.filename,
        filepath=str(filepath),
        file_type=ext,
        content=text,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    if chunks:
        embeddings = await lm_studio.embeddings(chunks)
        if embeddings:
            chroma.add_documents(
                collection_name=collection.name,
                documents=chunks,
                metadatas=[{"document_id": doc.id, "filename": file.filename} for _ in chunks],
                ids=[f"{doc.id}_{i}" for i in range(len(chunks))],
            )

    return {"document": doc, "chunks": len(chunks)}


@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)
    db.delete(doc)
    db.commit()
    return {"ok": True}
