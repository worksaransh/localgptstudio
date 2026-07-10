import httpx
from bs4 import BeautifulSoup
from typing import Optional
from services import LMStudioService


class ResearchService:
    def __init__(self, lm_studio: LMStudioService):
        self.lm_studio = lm_studio

    async def deep_research(self, query: str) -> dict:
        sources = await self._search_web(query)
        extracted = []
        for url in sources[:5]:
            content = await self._extract_content(url)
            if content:
                extracted.append({"url": url, "content": content[:3000]})

        summary = await self._summarize_sources(query, extracted)
        report = await self._generate_report(query, extracted, summary)

        return {
            "query": query,
            "sources": sources[:10],
            "citations": [{"url": s} for s in sources[:5]],
            "summary": summary,
            "report": report,
        }

    async def _search_web(self, query: str) -> list[str]:
        urls = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"https://html.duckduckgo.com/html/",
                    params={"q": query},
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.select("a.result__a"):
                    href = a.get("href")
                    if href and href.startswith("http"):
                        urls.append(href)
        except Exception:
            pass
        return urls

    async def _extract_content(self, url: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                soup = BeautifulSoup(resp.text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer"]):
                    tag.decompose()
                return soup.get_text(separator=" ", strip=True)[:3000]
        except Exception:
            return None

    async def _summarize_sources(self, query: str, sources: list[dict]) -> str:
        context = "\n\n".join(
            [f"Source: {s['url']}\n{s['content'][:1000]}" for s in sources]
        )
        messages = [
            {
                "role": "system",
                "content": "You are a research assistant. Summarize the key findings from the sources.",
            },
            {
                "role": "user",
                "content": f"Query: {query}\n\nSources:\n{context}\n\nProvide a concise summary of findings.",
            },
        ]
        result = await self.lm_studio.chat_completions(messages, max_tokens=1024)
        if result.get("error"):
            return "Could not generate summary."
        return result["choices"][0]["message"]["content"]

    async def _generate_report(self, query: str, sources: list[dict], summary: str) -> str:
        context = "\n\n".join(
            [f"Source: {s['url']}\n{s['content'][:2000]}" for s in sources]
        )
        messages = [
            {
                "role": "system",
                "content": "You are a research analyst. Generate a detailed, well-structured report.",
            },
            {
                "role": "user",
                "content": f"Query: {query}\n\nSummary: {summary}\n\nSources:\n{context}\n\nGenerate a comprehensive report with introduction, analysis, and conclusion.",
            },
        ]
        result = await self.lm_studio.chat_completions(messages, max_tokens=4096)
        if result.get("error"):
            return "Could not generate report."
        return result["choices"][0]["message"]["content"]
