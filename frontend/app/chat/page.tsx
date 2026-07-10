"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MessageSquare, Plus, Search, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import { Toaster, toast } from "sonner"

interface Chat {
  id: number
  title: string
  model: string
  updated_at: string
}

export default function ChatPage() {
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChats()
  }, [])

  async function loadChats() {
    try {
      const data = await api.listChats(search || undefined)
      setChats(data.chats)
    } catch (err) {
      toast.error("Failed to load chats")
    } finally {
      setLoading(false)
    }
  }

  async function createChat() {
    try {
      const data = await api.createChat({ title: "New Chat" })
      router.push(`/chat/${data.chat.id}`)
    } catch (err) {
      toast.error("Failed to create chat")
    }
  }

  async function deleteChat(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    try {
      await api.deleteChat(id)
      setChats(chats.filter((c) => c.id !== id))
      toast.success("Chat deleted")
    } catch (err) {
      toast.error("Failed to delete chat")
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => loadChats(), 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border flex items-center gap-4">
        <h1 className="text-xl font-semibold flex-1">Chats</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={createChat}>
          <Plus className="h-4 w-4 mr-2" /> New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <MessageSquare className="h-12 w-12" />
            <p>No chats yet</p>
            <Button onClick={createChat} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Create your first chat
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 max-w-3xl mx-auto">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors flex items-center"
                onClick={() => router.push(`/chat/${chat.id}`)}
              >
                <MessageSquare className="h-5 w-5 mr-3 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(chat.updated_at)}
                    {chat.model && ` \u00b7 ${chat.model}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 shrink-0"
                  onClick={(e) => deleteChat(e, chat.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
