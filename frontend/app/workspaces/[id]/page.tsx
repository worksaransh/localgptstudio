"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { cn, formatDate } from "@/lib/utils"
import { Toaster, toast } from "sonner"
import {
  MessageSquare, Bot, Database, Layers, FileText,
  ListChecks, ArrowRight, Search, Sparkles,
} from "lucide-react"

interface Dashboard {
  workspace: { id: number; name: string; description: string; category: string; updated_at: string }
  stats: { chats: number; documents: number; agents: number; memory_entries: number; assets: number; tasks: number }
  recent_chats: { id: number; title: string; updated_at: string }[]
}

export default function WorkspaceDashboard() {
  const params = useParams()
  const router = useRouter()
  const wsId = Number(params.id)
  const [data, setData] = useState<Dashboard | null>(null)
  const [searchQ, setSearchQ] = useState("")
  const [searchResults, setSearchResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [wsId])

  async function loadDashboard() {
    try { const d = await api.getWorkspaceDashboard(wsId); setData(d) }
    catch { toast.error("Failed to load workspace") }
    finally { setLoading(false) }
  }

  async function doSearch() {
    if (!searchQ.trim()) return
    try { const r = await api.searchWorkspace(wsId, searchQ); setSearchResults(r) }
    catch { toast.error("Search failed") }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
        Loading...
      </div>
    </div>
  )

  if (!data) return <div className="h-full flex items-center justify-center text-muted-foreground">Workspace not found</div>

  const { workspace, stats, recent_chats } = data

  const quickLinks = [
    { label: "New Chat", icon: MessageSquare, href: `/workspaces/${wsId}/chats`, count: stats.chats, color: "from-blue-500/20 to-blue-600/10" },
    { label: "Knowledge", icon: Database, href: `/workspaces/${wsId}/documents`, count: stats.documents, color: "from-green-500/20 to-green-600/10" },
    { label: "Memory", icon: Layers, href: `/workspaces/${wsId}/memory`, count: stats.memory_entries, color: "from-purple-500/20 to-purple-600/10" },
    { label: "Agents", icon: Bot, href: `/workspaces/${wsId}/agents`, count: stats.agents, color: "from-orange-500/20 to-orange-600/10" },
    { label: "Assets", icon: FileText, href: `/workspaces/${wsId}/assets`, count: stats.assets, color: "from-pink-500/20 to-pink-600/10" },
    { label: "Tasks", icon: ListChecks, href: `/workspaces/${wsId}/tasks`, count: stats.tasks, color: "from-teal-500/20 to-teal-600/10" },
  ]

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">{workspace.name}</h1>
            <p className="text-xs text-muted-foreground">{workspace.description || workspace.category}</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-9 rounded-xl border border-input bg-transparent pl-9 pr-3 text-sm"
            placeholder="Search workspace..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
        </div>
        {searchResults && (
          <div className="mt-2 text-xs text-muted-foreground">
            Found {(searchResults.chats?.length || 0) + (searchResults.documents?.length || 0) + (searchResults.memory?.length || 0) + (searchResults.assets?.length || 0)} results
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Quick links grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Card
                key={link.label}
                className="p-4 cursor-pointer hover:shadow-sm transition-all border-border/60 hover:border-border"
                onClick={() => router.push(link.href)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-2xl font-semibold">{link.count}</span>
                </div>
                <p className="text-sm font-medium">{link.label}</p>
              </Card>
            )
          })}
        </div>

        {/* Recent Chats */}
        <Card className="border-border/60">
          <div className="p-4 pb-3 flex items-center justify-between border-b border-border/50">
            <h2 className="text-sm font-medium">Recent Chats</h2>
            <button
              onClick={() => router.push(`/workspaces/${wsId}/chats`)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-2">
            {recent_chats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No chats yet</p>
            ) : (
              recent_chats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer text-sm"
                  onClick={() => router.push(`/workspaces/${wsId}/chats/${chat.id}`)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatDate(chat.updated_at)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
