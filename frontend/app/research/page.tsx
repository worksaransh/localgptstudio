"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, ExternalLink, FileText } from "lucide-react"
import { Toaster, toast } from "sonner"

interface ResearchResult {
  query: string
  sources: string[]
  citations: { url: string }[]
  summary: string
  report: string
}

export default function ResearchPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResearchResult | null>(null)

  async function startResearch() {
    if (!query.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const data = await api.deepResearch(query)
      setResult(data)
      toast.success("Research complete")
    } catch { toast.error("Research failed") }
    finally { setLoading(false) }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold mb-4">Deep Research</h1>
        <div className="flex gap-2 max-w-4xl">
          <Textarea
            placeholder="Enter your research query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[60px]"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), startResearch())}
          />
          <Button onClick={startResearch} disabled={loading || !query.trim()} className="self-end">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loading ? "Researching..." : "Research"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Searching the web and analyzing sources...</p>
          </div>
        )}

        {result && !loading && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" /> Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" /> Sources ({result.sources.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.sources.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-500 hover:underline truncate">
                      {url}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Detailed Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="message-content whitespace-pre-wrap text-sm leading-relaxed">{result.report}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Search className="h-12 w-12" />
            <p>Enter a query to start deep research</p>
            <p className="text-sm">I'll search the web, extract sources, and generate a comprehensive report</p>
          </div>
        )}
      </div>
    </div>
  )
}
