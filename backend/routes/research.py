from fastapi import APIRouter
from services import LMStudioService
from services.research import ResearchService
from pydantic import BaseModel

router = APIRouter(prefix="/api/research", tags=["Research"])
lm_studio = LMStudioService()
research_service = ResearchService(lm_studio)


class ResearchRequest(BaseModel):
    query: str


@router.post("/deep")
async def deep_research(data: ResearchRequest):
    result = await research_service.deep_research(data.query)
    return result
