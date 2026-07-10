import httpx
from bs4 import BeautifulSoup
from typing import Optional


class BrowserService:
    async def search(self, query: str, max_results: int = 10) -> list[dict]:
        results = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": query},
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
                )
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.select("a.result__a"):
                    href = a.get("href")
                    if href and href.startswith("http"):
                        snippet_el = a.find_parent("div", class_="result")
                        snippet = ""
                        if snippet_el:
                            s = snippet_el.select_one("a.result__snippet")
                            if s:
                                snippet = s.get_text(strip=True)
                        title_el = a.select_one("span")
                        title = title_el.get_text(strip=True) if title_el else ""
                        results.append({
                            "url": href,
                            "title": title or href,
                            "snippet": snippet,
                        })
                    if len(results) >= max_results:
                        break
        except Exception:
            pass
        return results

    async def fetch(self, url: str, max_chars: int = 8000) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                )
                soup = BeautifulSoup(resp.text, "html.parser")
                title = soup.title.string.strip() if soup.title else ""
                for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                    tag.decompose()
                text = soup.get_text(separator=" ", strip=True)
                if len(text) > max_chars:
                    text = text[:max_chars] + "..."
                return {"url": url, "title": title, "content": text}
        except Exception as e:
            return None
