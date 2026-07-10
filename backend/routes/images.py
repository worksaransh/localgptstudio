from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.image import Image
from services.comfyui import ComfyUIService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/images", tags=["Images"])
comfyui = ComfyUIService()


class ImageGenerate(BaseModel):
    prompt: str
    negative_prompt: str = ""
    model: str = ""
    width: int = 1024
    height: int = 1024


@router.get("")
def list_images(db: Session = Depends(get_db)):
    images = db.query(Image).order_by(Image.created_at.desc()).all()
    return {"images": images}


@router.post("/generate")
async def generate_image(data: ImageGenerate, db: Session = Depends(get_db)):
    filename = await comfyui.generate_image(
        prompt=data.prompt,
        negative_prompt=data.negative_prompt,
        width=data.width,
        height=data.height,
        model=data.model,
    )
    if not filename:
        raise HTTPException(500, "Image generation failed")

    img = Image(
        prompt=data.prompt,
        negative_prompt=data.negative_prompt,
        model=data.model,
        filepath=f"/images/{filename}",
        width=data.width,
        height=data.height,
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    return {"image": img}


@router.delete("/{image_id}")
def delete_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(404, "Image not found")
    db.delete(img)
    db.commit()
    return {"ok": True}
