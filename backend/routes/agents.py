from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.agent import Agent
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/agents", tags=["Agents"])


class AgentCreate(BaseModel):
    name: str
    description: str = ""
    model: str = ""
    system_prompt: str = ""
    knowledge_base: str = ""
    temperature: float = 0.7


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    knowledge_base: Optional[str] = None
    temperature: Optional[float] = None


@router.get("")
def list_agents(db: Session = Depends(get_db)):
    agents = db.query(Agent).all()
    return {"agents": agents}


@router.post("")
def create_agent(data: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(**data.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return {"agent": agent}


@router.get("/{agent_id}")
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    return {"agent": agent}


@router.patch("/{agent_id}")
def update_agent(agent_id: int, data: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(agent, key, val)
    db.commit()
    db.refresh(agent)
    return {"agent": agent}


@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    db.delete(agent)
    db.commit()
    return {"ok": True}
