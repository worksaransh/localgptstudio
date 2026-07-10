import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR.parent / "uploads"
DB_PATH = BASE_DIR / "localgpt.db"
CHROMA_DIR = BASE_DIR / "chroma_db"

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
COMFYUI_URL = os.getenv("COMFYUI_URL", "http://localhost:8188")

DEFAULT_PROVIDER_CONFIGS = {
    "lm_studio": {
        "base_url": LM_STUDIO_URL,
        "enabled": True,
    },
    "openai": {
        "base_url": OPENAI_BASE_URL,
        "api_key": OPENAI_API_KEY,
        "enabled": bool(OPENAI_API_KEY),
    },
    "anthropic": {
        "api_key": ANTHROPIC_API_KEY,
        "enabled": bool(ANTHROPIC_API_KEY),
    },
    "google": {
        "api_key": GOOGLE_API_KEY,
        "enabled": bool(GOOGLE_API_KEY),
    },
}

DEFAULT_CONTEXT_LENGTH = 8192
DEFAULT_TEMPERATURE = 0.7
DEFAULT_TOP_P = 0.95
DEFAULT_MAX_TOKENS = 4096

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
