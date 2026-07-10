import httpx
import json
from typing import AsyncGenerator
from .base import BaseProvider


class GoogleProvider(BaseProvider):
    name = "google"
    display_name = "Google Gemini"

    def __init__(self, config: dict):
        super().__init__(config)
        self.api_key = config.get("api_key", "")
        self.base_url = config.get("base_url", "https://generativelanguage.googleapis.com/v1beta")

    async def list_models(self) -> list[dict]:
        return [
            {"id": "gemini-2.0-flash", "object": "model", "owned_by": "google"},
            {"id": "gemini-2.0-flash-lite", "object": "model", "owned_by": "google"},
            {"id": "gemini-1.5-pro", "object": "model", "owned_by": "google"},
            {"id": "gemini-1.5-flash", "object": "model", "owned_by": "google"},
        ]

    async def chat_completions(
        self,
        messages: list,
        model: str = "",
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
        stream: bool = False,
    ) -> dict:
        model_name = model or "gemini-2.0-flash"
        contents = []
        for m in messages:
            if m["role"] in ("user", "assistant"):
                contents.append({"role": m["role"], "parts": [{"text": m["content"]}]})

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "topP": top_p,
                "maxOutputTokens": max_tokens,
            },
        }

        try:
            url = f"{self.base_url}/models/{model_name}:generateContent?key={self.api_key}"
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                text = ""
                for candidate in data.get("candidates", []):
                    for part in candidate.get("content", {}).get("parts", []):
                        text += part.get("text", "")
                return {
                    "choices": [{"message": {"content": text, "role": "assistant"}}],
                    "usage": {},
                }
        except httpx.HTTPStatusError as e:
            return {"error": True, "message": f"Gemini error: {e.response.status_code} - {e.response.text}"}
        except httpx.RequestError as e:
            return {"error": True, "message": f"Cannot connect to Gemini API"}

    async def chat_completions_stream(
        self,
        messages: list,
        model: str = "",
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        model_name = model or "gemini-2.0-flash"
        contents = []
        for m in messages:
            if m["role"] in ("user", "assistant"):
                contents.append({"role": m["role"], "parts": [{"text": m["content"]}]})

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "topP": top_p,
                "maxOutputTokens": max_tokens,
            },
        }

        try:
            url = f"{self.base_url}/models/{model_name}:streamGenerateContent?key={self.api_key}&alt=sse"
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", url, json=payload) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            try:
                                chunk = json.loads(data)
                                for candidate in chunk.get("candidates", []):
                                    for part in candidate.get("content", {}).get("parts", []):
                                        text = part.get("text", "")
                                        if text:
                                            yield text
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            yield f"Error: {str(e)}"
