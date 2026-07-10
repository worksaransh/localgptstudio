from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.asset import Asset
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/workspaces/{workspace_id}/assets", tags=["Workspace Assets"])


class AssetCreate(BaseModel):
    name: str
    description: str = ""
    asset_type: str = "document"
    content: str = ""
    source: str = ""


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("")
def list_assets(workspace_id: int, asset_type: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Asset).filter(Asset.workspace_id == workspace_id)
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    return {"assets": query.order_by(desc(Asset.created_at)).all()}


@router.post("")
def create_asset(workspace_id: int, data: AssetCreate, db: Session = Depends(get_db)):
    asset = Asset(workspace_id=workspace_id, **data.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return {"asset": asset}


@router.delete("/{asset_id}")
def delete_asset(workspace_id: int, asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.workspace_id == workspace_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    db.delete(asset)
    db.commit()
    return {"ok": True}
