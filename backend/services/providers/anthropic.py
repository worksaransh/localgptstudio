import httpx
import json
from typing import AsyncGenerator
from .base import BaseProvider


class AnthropicProvider(BaseProvider):
    name = "anthropic"
    display_name = "Anthropic Claude"

    def __init__(self, config: dict):
        super().__init__(config)
        self.api_key = config.get("api_key", "")
        self.base_url = config.get("base_url", "https://api.anthropic.com/v1")
        self.client = httpx.AsyncClient(
            timeout=120.0,
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
            },
        )

    async def list_models(self) -> list[dict]:
        return [
            {"id": "claude-3-5-sonnet-20241022", "object": "model", "owned_by": "anthropic"},
            {"id": "claude-3-5-haiku-20241022", "object": "model", "owned_by": "anthropic"},
            {"id": "claude-3-opus-20240229", "object": "model", "owned_by": "anthropic"},
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
        system = None
        anthropic_messages = []
        for m in messages:
            if m["role"] == "system":
                system = m["content"]
            else:
                anthropic_messages.append({"role": m["role"], "content": m["content"]})

        if not anthropic_messages:
            anthropic_messages = [{"role": "user", "content": "Hello"}]

        payload = {
            "model": model or "claude-3-5-sonnet-20241022",
            "messages": anthropic_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream,
        }
        if system:
            payload["system"] = system

        try:
            resp = await self.client.post(
                f"{self.base_url}/messages", json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            content = ""
            for block in data.get("content", []):
                if block.get("type") == "text":
                    content += block.get("text", "")
            return {
                "choices": [{"message": {"content": content, "role": "assistant"}}],
                "usage": data.get("usage", {}),
            }
        except httpx.HTTPStatusError as e:
            return {"error": True, "message": f"Anthropic error: {e.response.status_code} - {e.response.text}"}
        except httpx.RequestError as e:
            return {"error": True, "message": f"Cannot connect to Anthropic API"}

    async def chat_completions_stream(
        self,
        messages: list,
        model: str = "",
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        system = None
        anthropic_messages = []
        for m in messages:
            if m["role"] == "system":
                system = m["content"]
            else:
                anthropic_messages.append({"role": m["role"], "content": m["content"]})

        if not anthropic_messages:
            anthropic_messages = [{"role": "user", "content": "Hello"}]

        payload = {
            "model": model or "claude-3-5-sonnet-20241022",
            "messages": anthropic_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }
        if system:
            payload["system"] = system

        try:
            async with httpx.AsyncClient(
                timeout=120.0,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                },
            ) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/messages",
                    json=payload,
                ) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                if chunk.get("type") == "content_block_delta":
                                    delta = chunk.get("delta", {})
                                    text = delta.get("text", "")
                                    if text:
                                        yield text
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            yield f"Error: {str(e)}"

    async def close(self):
        await self.client.aclose()
