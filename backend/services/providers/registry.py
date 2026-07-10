from typing import Optional
from .base import BaseProvider
from .lm_studio import LMStudioProvider
from .openai_compat import OpenAICompatProvider
from .anthropic import AnthropicProvider
from .google import GoogleProvider


class ProviderRegistry:
    _providers: dict[str, BaseProvider] = {}
    _config: dict[str, dict] = {}

    @classmethod
    def register_provider(cls, name: str, provider: BaseProvider):
        cls._providers[name] = provider

    @classmethod
    def get_provider(cls, name: str) -> Optional[BaseProvider]:
        return cls._providers.get(name)

    @classmethod
    def get_provider_for_model(cls, model: str) -> Optional[BaseProvider]:
        for name, provider in cls._providers.items():
            models = getattr(provider, "_cached_models", None)
            if models is None:
                continue
            for m in models:
                if m.get("id") == model:
                    return provider
        for name, provider in cls._providers.items():
            models = getattr(provider, "_cached_models", None)
            if models:
                for m in models:
                    if model.startswith(m.get("id", "").split("-")[0]) or m.get("id", "").startswith(model.split("-")[0]):
                        return provider
        return cls._providers.get("lm_studio")

    @classmethod
    def get_all_providers(cls) -> dict[str, BaseProvider]:
        return dict(cls._providers)

    @classmethod
    def get_provider_names(cls) -> list[str]:
        return list(cls._providers.keys())

    @classmethod
    async def list_all_models(cls) -> list[dict]:
        all_models = []
        for name, provider in cls._providers.items():
            try:
                models = await provider.list_models()
                provider._cached_models = models
                for m in models:
                    m["provider"] = name
                all_models.extend(models)
            except Exception:
                continue
        return all_models

    @classmethod
    async def initialize(cls, configs: dict[str, dict]):
        provider_classes = {
            "lm_studio": LMStudioProvider,
            "openai": OpenAICompatProvider,
            "anthropic": AnthropicProvider,
            "google": GoogleProvider,
        }
        for name, cfg in configs.items():
            if cfg.get("enabled", False) and name in provider_classes:
                provider_cls = provider_classes[name]
                provider = provider_cls(cfg)
                cls._providers[name] = provider
                cls._config[name] = cfg

    @classmethod
    async def shutdown(cls):
        for provider in cls._providers.values():
            await provider.close()
        cls._providers.clear()
        cls._config.clear()
