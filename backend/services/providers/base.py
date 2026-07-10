from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional


class BaseProvider(ABC):
    name: str = ""
    display_name: str = ""

    def __init__(self, config: dict = None):
        if config is None:
            config = {}
        self.config = config

    @abstractmethod
    async def list_models(self) -> list[dict]:
        ...

    @abstractmethod
    async def chat_completions(
        self,
        messages: list,
        model: str = "",
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
        stream: bool = False,
    ) -> dict:
        ...

    @abstractmethod
    async def chat_completions_stream(
        self,
        messages: list,
        model: str = "",
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        ...

    async def embeddings(self, texts: list[str], model: str = "") -> list[list[float]]:
        return []

    async def close(self):
        pass
