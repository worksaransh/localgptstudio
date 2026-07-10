from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.task import Task
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/workspaces/{workspace_id}/tasks", tags=["Workspace Tasks"])


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    assigned_agent_id: Optional[int] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    result: Optional[str] = None
    title: Optional[str] = None


@router.get("")
def list_tasks(workspace_id: int, status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Task).filter(Task.workspace_id == workspace_id)
    if status:
        query = query.filter(Task.status == status)
    return {"tasks": query.order_by(desc(Task.created_at)).all()}


@router.post("")
def create_task(workspace_id: int, data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(workspace_id=workspace_id, **data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"task": task}


@router.patch("/{task_id}")
def update_task(workspace_id: int, task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.workspace_id == workspace_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(task, key, val)
    db.commit()
    db.refresh(task)
    return {"task": task}


@router.delete("/{task_id}")
def delete_task(workspace_id: int, task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.workspace_id == workspace_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}
