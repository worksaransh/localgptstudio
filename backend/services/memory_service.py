import re
from typing import Optional
from services import LMStudioService


EXTRACTION_PROMPT = """Extract structured knowledge from the following document content.
Return a JSON array of memory entries. Each entry has: title, memory_type, content, importance_score (0.0-1.0).

Memory types: key_fact, faq, product, service, competitor, number, terminology, procedure, research_insight, general

Document content:
{content}

Return ONLY valid JSON array, no other text."""


class MemoryService:
    def __init__(self, lm_studio: Optional[LMStudioService] = None):
        self.lm_studio = lm_studio

    async def extract_memory(self, text: str, source: str = "") -> list[dict]:
        if not text.strip():
            return []

        if self.lm_studio:
            try:
                result = await self.lm_studio.chat_completions(
                    messages=[
                        {
                            "role": "system",
                            "content": "You extract structured memory from documents. Return only JSON.",
                        },
                        {"role": "user", "content": EXTRACTION_PROMPT.format(content=text[:8000])},
                    ],
                    max_tokens=4096,
                    temperature=0.1,
                )
                if not result.get("error"):
                    content = result["choices"][0]["message"]["content"]
                    import json
                    # Try to extract JSON array from response
                    match = re.search(r"\[.*\]", content, re.DOTALL)
                    if match:
                        entries = json.loads(match.group())
                        for e in entries:
                            e.setdefault("source", source)
                            e.setdefault("importance_score", 1.0)
                        return entries
            except Exception:
                pass

        # Fallback: simple extraction
        return self._simple_extraction(text, source)

    def _simple_extraction(self, text: str, source: str) -> list[dict]:
        entries = []
        sentences = re.split(r'(?<=[.!?])\s+', text[:5000])

        # Extract numbers (prices, percentages, etc.)
        numbers = re.findall(r'(?:Rs\.?|₹|\$|EUR)?\s*\d+[\.\,]?\d*\s*(?:%|million|billion|thousand|lakh|crore)?', text)
        if numbers:
            entries.append({
                "title": "Important Numbers",
                "memory_type": "number",
                "content": ", ".join(numbers[:20]),
                "importance_score": 0.7,
                "source": source,
            })

        # Extract potential FAQs
        q_matches = re.findall(r'(?:What|How|Why|When|Where|Who|Which|Can|Do|Is|Are)\s[^?]*\?', text)
        for q in q_matches[:5]:
            entries.append({
                "title": q[:80],
                "memory_type": "faq",
                "content": q,
                "importance_score": 0.6,
                "source": source,
            })

        # Key facts from first sentences
        for s in sentences[:3]:
            if len(s) > 30:
                entries.append({
                    "title": s[:80],
                    "memory_type": "key_fact",
                    "content": s,
                    "importance_score": 0.8,
                    "source": source,
                })

        return entries

    async def retrieve_relevant(
        self,
        query: str,
        memory_entries: list[dict],
        max_entries: int = 5,
    ) -> list[dict]:
        """Simple relevance matching based on keyword overlap."""
        if not memory_entries:
            return []

        query_lower = query.lower()
        query_words = set(re.findall(r'\w+', query_lower))

        scored = []
        for entry in memory_entries:
            content = (entry.get("title", "") + " " + entry.get("content", "")).lower()
            content_words = set(re.findall(r'\w+', content))
            overlap = len(query_words & content_words)
            if overlap > 0:
                score = overlap / max(len(query_words), 1) * entry.get("importance_score", 1.0)
                scored.append((score, entry))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [entry for _, entry in scored[:max_entries]]
