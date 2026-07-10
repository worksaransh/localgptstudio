"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageSquare, Plus, Search, Trash2, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Toaster, toast } from "sonner"

export default function WorkspaceChats() {
  const params = useParams()
  const router = useRouter()
  const wsId = Number(params.id)
  const [chats, setChats] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const searchTimer = useRef<number | undefined>(undefined)

  useEffect(() => { loadChats() }, [])
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => loadChats(), 300)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  async function loadChats() {
    try { const data = await api.wsListChats(wsId, search || undefined); setChats(data.chats) }
    catch { toast.error("Failed to load chats") }
    finally { setLoading(false) }
  }

  async function createChat() {
    setCreating(true)
    try {
      const data = await api.wsCreateChat(wsId, { title: "New Chat" })
      router.push(`/workspaces/${wsId}/chats/${data.chat.id}`)
    } catch { toast.error("Failed to create chat"); setCreating(false) }
  }

  async function deleteChat(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    try { await api.wsDeleteChat(wsId, id); loadChats() }
    catch { toast.error("Failed to delete") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-medium">Chats</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." className="h-8 w-48 pl-8 text-xs rounded-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={createChat} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            New Chat
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
              Loading...
            </div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No chats yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">Start a conversation with your local AI assistant.</p>
            <Button variant="outline" size="sm" onClick={createChat} className="mt-1">
              <Plus className="h-4 w-4 mr-1.5" /> New Chat
            </Button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-1.5">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors border-border/60"
                onClick={() => router.push(`/workspaces/${wsId}/chats/${chat.id}`)}
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(chat.updated_at)}{chat.model && ` \u00b7 ${chat.model}`}</p>
                </div>
                <button onClick={(e) => deleteChat(e, chat.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
