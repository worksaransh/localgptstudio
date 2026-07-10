from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from database import get_db
from models.chat import Chat
from pydantic import BaseModel

router = APIRouter(prefix="/api/workspaces/{workspace_id}/chats", tags=["Workspace Chats"])


class ChatCreate(BaseModel):
    title: str = "New Chat"
    model: str = ""
    system_prompt: str = ""
    agent_id: Optional[int] = None


class ChatUpdate(BaseModel):
    title: Optional[str] = None


@router.get("")
def list_chats(workspace_id: int, search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Chat).filter(Chat.workspace_id == workspace_id).order_by(desc(Chat.updated_at))
    if search:
        query = query.filter(Chat.title.ilike(f"%{search}%"))
    return {"chats": query.all()}


@router.post("")
def create_chat(workspace_id: int, data: ChatCreate, db: Session = Depends(get_db)):
    chat = Chat(workspace_id=workspace_id, **data.model_dump())
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {"chat": chat}


@router.get("/{chat_id}")
def get_chat(workspace_id: int, chat_id: int, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.workspace_id == workspace_id).first()
    if not chat:
        raise HTTPException(404, "Chat not found")
    return {"chat": chat}


@router.patch("/{chat_id}")
def update_chat(workspace_id: int, chat_id: int, data: ChatUpdate, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.workspace_id == workspace_id).first()
    if not chat:
        raise HTTPException(404, "Chat not found")
    if data.title is not None:
        chat.title = data.title
    db.commit()
    db.refresh(chat)
    return {"chat": chat}


@router.delete("/{chat_id}")
def delete_chat(workspace_id: int, chat_id: int, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.workspace_id == workspace_id).first()
    if not chat:
        raise HTTPException(404, "Chat not found")
    db.delete(chat)
    db.commit()
    return {"ok": True}
