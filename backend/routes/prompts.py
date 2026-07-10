from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.prompt import Prompt
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/prompts", tags=["Prompts"])


class PromptCreate(BaseModel):
    title: str
    content: str
    category: str = "General"


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


@router.get("")
def list_prompts(category: str = None, db: Session = Depends(get_db)):
    query = db.query(Prompt)
    if category:
        query = query.filter(Prompt.category == category)
    return {"prompts": query.all()}


@router.post("")
def create_prompt(data: PromptCreate, db: Session = Depends(get_db)):
    prompt = Prompt(**data.model_dump())
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return {"prompt": prompt}


@router.get("/{prompt_id}")
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(404, "Prompt not found")
    return {"prompt": prompt}


@router.patch("/{prompt_id}")
def update_prompt(prompt_id: int, data: PromptUpdate, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(404, "Prompt not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(prompt, key, val)
    db.commit()
    db.refresh(prompt)
    return {"prompt": prompt}


@router.delete("/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(404, "Prompt not found")
    db.delete(prompt)
    db.commit()
    return {"ok": True}
