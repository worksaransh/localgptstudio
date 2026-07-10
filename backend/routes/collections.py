from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.collection import Collection
from services.chroma_service import ChromaService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/collections", tags=["Collections"])
chroma = ChromaService()


class CollectionCreate(BaseModel):
    name: str
    description: str = ""


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("")
def list_collections(db: Session = Depends(get_db)):
    collections = db.query(Collection).all()
    return {"collections": collections}


@router.post("")
def create_collection(data: CollectionCreate, db: Session = Depends(get_db)):
    existing = db.query(Collection).filter(Collection.name == data.name).first()
    if existing:
        raise HTTPException(400, "Collection already exists")
    collection = Collection(name=data.name, description=data.description)
    db.add(collection)
    db.commit()
    chroma.get_or_create_collection(data.name)
    db.refresh(collection)
    return {"collection": collection}


@router.get("/{collection_id}")
def get_collection(collection_id: int, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(404, "Collection not found")
    return {"collection": collection}


@router.patch("/{collection_id}")
def update_collection(collection_id: int, data: CollectionUpdate, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(404, "Collection not found")
    if data.name is not None:
        collection.name = data.name
    if data.description is not None:
        collection.description = data.description
    db.commit()
    db.refresh(collection)
    return {"collection": collection}


@router.delete("/{collection_id}")
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(404, "Collection not found")
    chroma.delete_collection(collection.name)
    db.delete(collection)
    db.commit()
    return {"ok": True}
