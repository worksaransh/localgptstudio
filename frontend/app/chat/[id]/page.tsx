"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Send,
  ArrowLeft,
  Trash2,
  Settings2,
  Download,
  BrainCircuit,
  Image as ImageIcon,
  FileText,
  Sparkles,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Toaster, toast } from "sonner"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectItem } from "@/components/ui/select"

interface Message {
  id: number
  role: string
  content: string
  sources?: string
  image_url?: string
  created_at: string
}

interface Chat {
  id: number
  title: string
  model: string
  system_prompt: string
  temperature: number
  top_p: number
  max_tokens: number
  agent_id?: number
  collection_id?: number
}

export default function ChatRoom() {
  const params = useParams()
  const router = useRouter()
  const chatId = Number(params.id)
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [useRag, setUseRag] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadChat()
    loadModels()
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  async function loadChat() {
    try {
      const [chatData, messagesData] = await Promise.all([
        api.getChat(chatId),
        api.listMessages(chatId),
      ])
      setChat(chatData.chat)
      setMessages(messagesData.messages)
    } catch (err) {
      toast.error("Failed to load chat")
    } finally {
      setLoading(false)
    }
  }

  async function loadModels() {
    try {
      const data = await api.listModels()
      setModels((data.models || []).map((m: any) => m.id || m))
    } catch (err) {}
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    const userContent = input.trim()
    setInput("")
    setSending(true)
    setStreamingContent("")

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: userContent,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await api.sendMessage(chatId, {
        content: userContent,
        model: chat?.model || "",
        temperature: chat?.temperature || 0.7,
        top_p: chat?.top_p || 0.95,
        max_tokens: chat?.max_tokens || 4096,
        stream: true,
        use_rag: useRag,
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.done) break
              if (data.content) {
                fullContent += data.content
                setStreamingContent(fullContent)
              }
            } catch {}
          }
        }
      }

      if (fullContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: fullContent,
            created_at: new Date().toISOString(),
          },
        ])
        setStreamingContent("")
        loadChat()
      }
    } catch (err) {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  async function deleteChat() {
    try {
      await api.deleteChat(chatId)
      toast.success("Chat deleted")
      router.push("/chat")
    } catch (err) {
      toast.error("Failed to delete")
    }
  }

  function exportChat() {
    const text = messages
      .map((m) => `## ${m.role === "user" ? "You" : "Assistant"}\n${m.content}`)
      .join("\n\n")
    const blob = new Blob([text], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${chat?.title || "chat"}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Chat exported")
  }

  async function updateChatSettings(data: Partial<Chat>) {
    try {
      await api.updateChat(chatId, data)
      setChat((prev) => (prev ? { ...prev, ...data } : null))
      setShowSettings(false)
      toast.success("Settings updated")
    } catch (err) {
      toast.error("Failed to update settings")
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/chat")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold flex-1 truncate">{chat?.title || "Chat"}</h2>
        <Button
          variant={useRag ? "default" : "outline"}
          size="sm"
          onClick={() => setUseRag(!useRag)}
          className="gap-1"
        >
          <BrainCircuit className="h-4 w-4" /> RAG
        </Button>
        <Button variant="outline" size="sm" onClick={exportChat} className="gap-1">
          <Download className="h-4 w-4" /> Export
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={deleteChat}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <BrainCircuit className="h-12 w-12" />
            <p className="text-lg">Start a conversation</p>
            <p className="text-sm">Ask anything to your local AI assistant</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="message-content whitespace-pre-wrap">{msg.content}</div>
              {msg.sources && (
                <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                  Sources: {msg.sources}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1 opacity-70">
                {formatDate(msg.created_at)}
              </div>
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex gap-3 justify-start">
            <div className="max-w-[80%] rounded-lg p-4 bg-muted">
              <div className="message-content whitespace-pre-wrap">{streamingContent}</div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 animate-pulse" /> Generating...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            className="min-h-[2.5rem] max-h-32"
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={sending || !input.trim()} className="self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Model</label>
            <Select
              value={chat?.model || ""}
              onValueChange={(v) => updateChatSettings({ model: v })}
              placeholder="Select model"
            >
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea
              value={chat?.system_prompt || ""}
              onChange={(e) => updateChatSettings({ system_prompt: e.target.value })}
              placeholder="Optional system prompt..."
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium">Temp</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={chat?.temperature || 0.7}
                onChange={(e) => updateChatSettings({ temperature: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Top P</label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={chat?.top_p || 0.95}
                onChange={(e) => updateChatSettings({ top_p: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Tokens</label>
              <Input
                type="number"
                step="1"
                min="1"
                max="32768"
                value={chat?.max_tokens || 4096}
                onChange={(e) => updateChatSettings({ max_tokens: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
