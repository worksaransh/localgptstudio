from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.browser_service import BrowserService

router = APIRouter(prefix="/api/browser", tags=["Browser"])
browser = BrowserService()


class SearchRequest(BaseModel):
    query: str
    max_results: int = 10


class FetchRequest(BaseModel):
    url: str


@router.post("/search")
async def search_web(data: SearchRequest):
    if not data.query.strip():
        raise HTTPException(400, "Query is required")
    results = await browser.search(data.query, data.max_results)
    return {"results": results}


@router.post("/fetch")
async def fetch_page(data: FetchRequest):
    if not data.url.strip():
        raise HTTPException(400, "URL is required")
    if not data.url.startswith(("http://", "https://")):
        raise HTTPException(400, "Invalid URL")
    result = await browser.fetch(data.url)
    if not result:
        raise HTTPException(502, "Failed to fetch URL")
    return {"page": result}
