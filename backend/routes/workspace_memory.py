from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.memory import WorkspaceMemory, GlobalMemory
from services import LMStudioService
from services.memory_service import MemoryService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/workspaces/{workspace_id}/memory", tags=["Workspace Memory"])
lm_studio = LMStudioService()
mem_service = MemoryService(lm_studio)


class MemoryCreate(BaseModel):
    title: str
    content: str
    memory_type: str = "general"
    source: str = ""
    importance_score: float = 1.0


class MemoryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    importance_score: Optional[float] = None


@router.get("")
def list_memory(workspace_id: int, memory_type: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(WorkspaceMemory).filter(WorkspaceMemory.workspace_id == workspace_id)
    if memory_type:
        query = query.filter(WorkspaceMemory.memory_type == memory_type)
    return {"memory": query.order_by(desc(WorkspaceMemory.importance_score)).all()}


@router.post("")
def create_memory(workspace_id: int, data: MemoryCreate, db: Session = Depends(get_db)):
    mem = WorkspaceMemory(workspace_id=workspace_id, **data.model_dump())
    db.add(mem)
    db.commit()
    db.refresh(mem)
    return {"memory": mem}


@router.post("/extract")
async def extract_memory(workspace_id: int, data: dict, db: Session = Depends(get_db)):
    text = data.get("text", "")
    source = data.get("source", "manual")
    entries = await mem_service.extract_memory(text, source)
    saved = []
    for entry in entries:
        mem = WorkspaceMemory(
            workspace_id=workspace_id,
            title=entry.get("title", "")[:200],
            content=entry.get("content", ""),
            memory_type=entry.get("memory_type", "general"),
            source=entry.get("source", source),
            importance_score=entry.get("importance_score", 1.0),
        )
        db.add(mem)
        saved.append(mem)
    db.commit()
    return {"memory": saved}


@router.delete("/{memory_id}")
def delete_memory(workspace_id: int, memory_id: int, db: Session = Depends(get_db)):
    mem = db.query(WorkspaceMemory).filter(WorkspaceMemory.id == memory_id, WorkspaceMemory.workspace_id == workspace_id).first()
    if not mem:
        raise HTTPException(404, "Memory not found")
    db.delete(mem)
    db.commit()
    return {"ok": True}


# Global Memory
@router.get("/global")
def list_global_memory(db: Session = Depends(get_db)):
    return {"memory": db.query(GlobalMemory).order_by(desc(GlobalMemory.importance_score)).all()}


@router.post("/global")
def create_global_memory(data: MemoryCreate, db: Session = Depends(get_db)):
    mem = GlobalMemory(**data.model_dump())
    db.add(mem)
    db.commit()
    db.refresh(mem)
    return {"memory": mem}
