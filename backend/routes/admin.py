import psutil
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.chat import Chat
from models.message import Message
from models.document import Document
from models.api_log import ApiLog

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    chat_count = db.query(func.count(Chat.id)).scalar()
    message_count = db.query(func.count(Message.id)).scalar()
    document_count = db.query(func.count(Document.id)).scalar()
    total_tokens = db.query(func.sum(ApiLog.tokens_used)).scalar() or 0
    api_call_count = db.query(func.count(ApiLog.id)).scalar()

    try:
        cpu = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        ram_usage = memory.percent
        ram_total = memory.total / (1024 ** 3)
    except Exception:
        cpu = 0
        ram_usage = 0
        ram_total = 0

    return {
        "metrics": {
            "chat_count": chat_count,
            "message_count": message_count,
            "document_count": document_count,
            "total_tokens": total_tokens,
            "api_call_count": api_call_count,
            "cpu_percent": cpu,
            "ram_percent": ram_usage,
            "ram_total_gb": round(ram_total, 1),
        }
    }


@router.get("/logs")
def get_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(ApiLog).order_by(ApiLog.created_at.desc()).limit(limit).all()
    return {"logs": logs}
