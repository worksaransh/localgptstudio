from fastapi import APIRouter
from services.providers.registry import ProviderRegistry

router = APIRouter(prefix="/api/models", tags=["Models"])


@router.get("")
async def list_models():
    models = await ProviderRegistry.list_all_models()
    return {"models": models}


@router.get("/providers")
async def list_providers():
    providers = {}
    for name, provider in ProviderRegistry.get_all_providers().items():
        providers[name] = {
            "name": provider.name,
            "display_name": provider.display_name,
            "config": {k: v for k, v in provider.config.items() if k != "api_key"},
        }
    return {"providers": providers}
