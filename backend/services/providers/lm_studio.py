import httpx
import json
from typing import AsyncGenerator
from .base import BaseProvider


class LMStudioProvider(BaseProvider):
    name = "lm_studio"
    display_name = "LM Studio"

    def __init__(self, config: dict = None):
        if config is None:
            config = {}
        super().__init__(config)
        self.base_url = config.get("base_url", "http://localhost:1234/v1")
        self.client = httpx.AsyncClient(timeout=120.0)

    async def list_models(self) -> list[dict]:
        try:
            resp = await self.client.get(f"{self.base_url}/models")
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", [])
        except Exception:
            return []

    async def chat_completions(
        self,
        messages: list,
        model: str = "",
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
        stream: bool = False,
    ) -> dict:
        payload = {
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
            "stream": stream,
        }
        if model:
            payload["model"] = model

        try:
            resp = await self.client.post(
                f"{self.base_url}/chat/completions", json=payload
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            return {
                "error": True,
                "message": f"LM Studio error: {e.response.status_code} - {e.response.text}",
            }
        except httpx.RequestError as e:
            return {
                "error": True,
                "message": f"Cannot connect to LM Studio at {self.base_url}. Is it running?",
            }

    async def chat_completions_stream(
        self,
        messages: list,
        model: str = "",
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        payload = {
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if model:
            payload["model"] = model

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    json=payload,
                ) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            yield f"Error: {str(e)}"

    async def embeddings(self, texts: list[str], model: str = "") -> list[list[float]]:
        payload = {"input": texts}
        if model:
            payload["model"] = model
        try:
            resp = await self.client.post(f"{self.base_url}/embeddings", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return [item["embedding"] for item in data.get("data", [])]
        except Exception:
            return []

    async def close(self):
        await self.client.aclose()
