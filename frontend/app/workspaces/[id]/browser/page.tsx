"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Globe, Search, ExternalLink, Loader2, FileText, Send, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Toaster, toast } from "sonner"

interface SearchResult {
  url: string; title: string; snippet: string
}

interface PageResult {
  url: string; title: string; content: string
}

export default function WorkspaceBrowser() {
  const params = useParams()
  const wsId = Number(params.id)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [page, setPage] = useState<PageResult | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatResponse, setChatResponse] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState("")
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [modelOpen, setModelOpen] = useState(false)
  const modelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.listModels().then((d) => {
      const m = (d.models || []).map((x: any) => x.id)
      setModels(m)
      if (m.length > 0) setSelectedModel(m[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function doSearch() {
    if (!query.trim()) return
    setLoading(true); setSearchResults(null); setPage(null)
    try {
      const data = await api.browserSearch(query)
      setSearchResults(data.results)
    } catch { toast.error("Search failed") }
    finally { setLoading(false) }
  }

  async function openUrl(url: string) {
    setSelectedUrl(url)
    setPageLoading(true); setPage(null)
    try {
      const data = await api.browserFetch(url)
      setPage(data.page)
    } catch { toast.error("Failed to fetch page") }
    finally { setPageLoading(false) }
  }

  async function analyzePage() {
    if (!page || !chatInput.trim() || chatLoading) return
    setChatLoading(true); setChatResponse("")
    try {
      const res = await fetch(`http://localhost:8000/api/chats/0/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Page: ${page.title}\nURL: ${page.url}\n\nContent:\n${page.content.slice(0, 6000)}\n\nQuestion: ${chatInput}`,
          model: selectedModel || undefined,
          stream: true, temperature: 0.7, top_p: 0.95, max_tokens: 2048,
        }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let full = ""
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try { const d = JSON.parse(line.slice(6)); if (d.done) break; if (d.content) { full += d.content; setChatResponse(full) } } catch {}
          }
        }
      }
    } catch { toast.error("Analysis failed") }
    finally { setChatLoading(false) }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" />

      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-medium">Browser</h1>
        <div className="relative" ref={modelRef}>
          <button
            onClick={() => setModelOpen(!modelOpen)}
            className="h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors border border-transparent hover:border-border"
          >
            <span className="max-w-[120px] truncate">{selectedModel || "Select model"}</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", modelOpen && "rotate-180")} />
          </button>
          {modelOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50">
              <div className="p-1.5">
                {models.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-3 text-center">No models available</p>
                ) : (
                  models.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setSelectedModel(m); setModelOpen(false) }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedModel === m
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {m}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search the web or enter a URL..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              className="pl-9 h-9 text-sm rounded-xl"
            />
          </div>
          <Button size="sm" onClick={doSearch} disabled={loading || !query.trim()} className="rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Search results */}
        <div className={cn("flex-1 overflow-y-auto p-4", page && "w-1/2 border-r border-border")}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            </div>
          ) : searchResults === null ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Browse the web</p>
              <p className="text-xs text-muted-foreground max-w-xs">Search the web or enter a URL to fetch page content. Use results as context for your AI.</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No results found</div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((r, i) => (
                <Card key={i} className="p-3 border-border/60 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => openUrl(r.url)}>
                  <div className="flex items-start gap-2.5">
                    <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-blue-500 truncate">{r.url}</p>
                      {r.snippet && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.snippet}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Page viewer / Chat */}
        {page && (
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium truncate">{page.title}</p>
              </div>
              <button onClick={() => { setPage(null); setChatResponse("") }} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Page content preview */}
            <div className="flex-1 overflow-y-auto p-4">
              {pageLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Fetching page...
                  </div>
                </div>
              ) : (
                <>
                  <a href={page.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline mb-3">
                    <ExternalLink className="h-3 w-3" /> {page.url}
                  </a>
                  <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto bg-muted rounded-xl p-3">
                    {page.content.slice(0, 8000)}
                  </div>

                  {/* Chat about page */}
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Ask about this page</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Summarize, extract key points..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && analyzePage()}
                        className="h-8 text-xs rounded-lg"
                      />
                      <Button size="sm" onClick={analyzePage} disabled={chatLoading || !chatInput.trim()} className="h-8 w-8 p-0 rounded-lg">
                        {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                    {chatResponse && (
                      <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap bg-muted rounded-xl p-3">
                        {chatResponse}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

