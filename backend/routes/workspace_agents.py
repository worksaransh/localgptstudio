from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.agent import Agent
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/workspaces/{workspace_id}/agents", tags=["Workspace Agents"])


class AgentCreate(BaseModel):
    name: str
    description: str = ""
    model: str = ""
    system_prompt: str = ""
    temperature: float = 0.7


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None


@router.get("")
def list_agents(workspace_id: int, db: Session = Depends(get_db)):
    return {"agents": db.query(Agent).filter(Agent.workspace_id == workspace_id).all()}


@router.post("")
def create_agent(workspace_id: int, data: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(workspace_id=workspace_id, **data.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return {"agent": agent}


@router.get("/{agent_id}")
def get_agent(workspace_id: int, agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.workspace_id == workspace_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    return {"agent": agent}


@router.patch("/{agent_id}")
def update_agent(workspace_id: int, agent_id: int, data: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.workspace_id == workspace_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(agent, key, val)
    db.commit()
    db.refresh(agent)
    return {"agent": agent}


@router.delete("/{agent_id}")
def delete_agent(workspace_id: int, agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.workspace_id == workspace_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    db.delete(agent)
    db.commit()
    return {"ok": True}
