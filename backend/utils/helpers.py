import uuid
import time
from functools import wraps
from database import SessionLocal
from models.api_log import ApiLog


def generate_id() -> str:
    return str(uuid.uuid4())


def log_api_call(endpoint: str, method: str, status_code: int, tokens: int = 0, duration: float = 0, request_data: str = None):
    db = SessionLocal()
    try:
        log = ApiLog(
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            tokens_used=tokens,
            duration_ms=duration * 1000,
            request_data=request_data,
        )
        db.add(log)
        db.commit()
    except Exception:
        pass
    finally:
        db.close()
