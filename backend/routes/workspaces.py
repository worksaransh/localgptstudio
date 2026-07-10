from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from database import get_db
from models.workspace import Workspace
from models.chat import Chat
from models.document import Document
from models.agent import Agent
from models.memory import WorkspaceMemory
from models.asset import Asset
from models.task import Task
from services.chroma_service import ChromaService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])
chroma = ChromaService()


class WorkspaceCreate(BaseModel):
    name: str
    description: str = ""
    category: str = "General"
    icon: str = "Briefcase"
    tags: str = ""
    default_model: str = ""


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    tags: Optional[str] = None
    default_model: Optional[str] = None


@router.get("")
def list_workspaces(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Workspace).order_by(desc(Workspace.updated_at))
    if search:
        query = query.filter(
            or_(Workspace.name.ilike(f"%{search}%"), Workspace.tags.ilike(f"%{search}%"))
        )
    return {"workspaces": query.all()}


@router.post("")
def create_workspace(data: WorkspaceCreate, db: Session = Depends(get_db)):
    ws = Workspace(**data.model_dump())
    db.add(ws)
    db.commit()
    db.refresh(ws)
    chroma.get_or_create_collection(f"ws_{ws.id}")
    return {"workspace": ws}


@router.get("/{workspace_id}")
def get_workspace(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    return {"workspace": ws}


@router.patch("/{workspace_id}")
def update_workspace(workspace_id: int, data: WorkspaceUpdate, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(ws, key, val)
    db.commit()
    db.refresh(ws)
    return {"workspace": ws}


@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    chroma.delete_collection(f"ws_{workspace_id}")
    db.delete(ws)
    db.commit()
    return {"ok": True}


@router.get("/{workspace_id}/dashboard")
def workspace_dashboard(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")

    chat_count = db.query(Chat).filter(Chat.workspace_id == workspace_id).count()
    doc_count = db.query(Document).filter(Document.workspace_id == workspace_id).count()
    agent_count = db.query(Agent).filter(Agent.workspace_id == workspace_id).count()
    memory_count = db.query(WorkspaceMemory).filter(WorkspaceMemory.workspace_id == workspace_id).count()
    asset_count = db.query(Asset).filter(Asset.workspace_id == workspace_id).count()
    task_count = db.query(Task).filter(Task.workspace_id == workspace_id).count()

    recent_chats = (
        db.query(Chat)
        .filter(Chat.workspace_id == workspace_id)
        .order_by(desc(Chat.updated_at))
        .limit(5)
        .all()
    )

    return {
        "workspace": ws,
        "stats": {
            "chats": chat_count,
            "documents": doc_count,
            "agents": agent_count,
            "memory_entries": memory_count,
            "assets": asset_count,
            "tasks": task_count,
        },
        "recent_chats": recent_chats,
    }


@router.get("/{workspace_id}/search")
def workspace_search(
    workspace_id: int,
    q: str = Query(...),
    db: Session = Depends(get_db),
):
    results = {"chats": [], "documents": [], "memory": [], "assets": []}

    chats = (
        db.query(Chat)
        .filter(Chat.workspace_id == workspace_id, Chat.title.ilike(f"%{q}%"))
        .all()
    )
    results["chats"] = [{"id": c.id, "title": c.title, "type": "chat"} for c in chats]

    docs = (
        db.query(Document)
        .filter(Document.workspace_id == workspace_id, Document.filename.ilike(f"%{q}%"))
        .all()
    )
    results["documents"] = [{"id": d.id, "title": d.filename, "type": "document"} for d in docs]

    memory = (
        db.query(WorkspaceMemory)
        .filter(
            WorkspaceMemory.workspace_id == workspace_id,
            or_(
                WorkspaceMemory.title.ilike(f"%{q}%"),
                WorkspaceMemory.content.ilike(f"%{q}%"),
            ),
        )
        .all()
    )
    results["memory"] = [{"id": m.id, "title": m.title, "type": "memory"} for m in memory]

    assets = (
        db.query(Asset)
        .filter(Asset.workspace_id == workspace_id, Asset.name.ilike(f"%{q}%"))
        .all()
    )
    results["assets"] = [{"id": a.id, "title": a.name, "type": "asset"} for a in assets]

    return results
