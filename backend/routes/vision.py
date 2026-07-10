import base64
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form
from services import LMStudioService
from config import UPLOAD_DIR

router = APIRouter(prefix="/api/vision", tags=["Vision"])
lm_studio = LMStudioService()


@router.post("/analyze")
async def analyze_image(file: UploadFile = File(...), prompt: str = Form("Describe this image")):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filepath = UPLOAD_DIR / f"{file_id}{ext}"

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    b64 = base64.b64encode(content).decode("utf-8")
    data_url = f"data:image/{ext[1:]};base64,{b64}"

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }
    ]

    result = await lm_studio.chat_completions(messages, max_tokens=2048)
    if result.get("error"):
        return {"error": result["message"]}

    return {
        "analysis": result["choices"][0]["message"]["content"],
        "filename": file.filename,
    }
