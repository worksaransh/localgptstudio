import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.setting import Setting
from config import DEFAULT_PROVIDER_CONFIGS
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/settings", tags=["Settings"])


class SettingUpdate(BaseModel):
    value: str


class ProviderConfig(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    enabled: bool = False


def _load_provider_configs():
    from database import SessionLocal

    configs = {}
    db = SessionLocal()
    try:
        settings_list = db.query(Setting).filter(Setting.key.like("provider:%")).all()
        stored = {s.key.split(":", 1)[1]: s.value for s in settings_list}
    finally:
        db.close()

    for name, default_cfg in DEFAULT_PROVIDER_CONFIGS.items():
        cfg = dict(default_cfg)
        if name in stored:
            try:
                stored_cfg = json.loads(stored[name])
                cfg.update(stored_cfg)
            except (json.JSONDecodeError, TypeError):
                pass
        configs[name] = cfg
    return configs


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(Setting).all()
    return {"settings": {s.key: s.value for s in settings}}


@router.get("/providers")
def get_providers():
    configs = _load_provider_configs()
    result = {}
    for name, cfg in configs.items():
        safe = {k: v for k, v in cfg.items() if k != "api_key"}
        safe["api_key_set"] = bool(cfg.get("api_key"))
        result[name] = safe
    return {"providers": result}


@router.put("/providers/{name}")
def update_provider(name: str, data: ProviderConfig, db: Session = Depends(get_db)):
    valid_providers = {"lm_studio", "openai", "anthropic", "google"}
    if name not in valid_providers:
        raise HTTPException(400, f"Unknown provider: {name}")

    configs = _load_provider_configs()
    existing = configs.get(name, {})
    merged = dict(existing)
    if data.base_url is not None:
        merged["base_url"] = data.base_url
    if data.api_key is not None:
        merged["api_key"] = data.api_key
    if data.enabled is not None:
        merged["enabled"] = data.enabled
    else:
        merged["enabled"] = True

    safe = dict(merged)
    if safe.get("api_key"):
        safe["api_key_set"] = True
        safe["api_key"] = "***" + safe["api_key"][-4:] if len(safe["api_key"]) > 4 else "***"

    setting = db.query(Setting).filter(Setting.key == f"provider:{name}").first()
    if setting:
        setting.value = json.dumps(merged)
    else:
        setting = Setting(key=f"provider:{name}", value=json.dumps(merged))
        db.add(setting)
    db.commit()

    return {"provider": name, "config": safe}


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(404, "Setting not found")
    return {"key": setting.key, "value": setting.value}


@router.put("/{key}")
def update_setting(key: str, data: SettingUpdate, db: Session = Depends(get_db)):
    if key == "providers":
        raise HTTPException(400, "Use /api/settings/providers/{name} for provider configs")
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting:
        setting.value = data.value
    else:
        setting = Setting(key=key, value=data.value)
        db.add(setting)
    db.commit()
    return {"key": key, "value": data.value}
