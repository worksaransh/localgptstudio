"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Send, ArrowLeft, Trash2, Download, Sparkles, User, Bot, ChevronDown,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { Toaster, toast } from "sonner"

interface Message { id: number; role: string; content: string; sources?: string; created_at: string }

export default function WorkspaceChatRoom() {
  const params = useParams()
  const router = useRouter()
  const wsId = Number(params.id)
  const chatId = Number(params.chatId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [chat, setChat] = useState<any>(null)
  const [models, setModels] = useState<string[]>([])
  const [modelOpen, setModelOpen] = useState(false)
  const modelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAll() }, [chatId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, streamingContent])
  useEffect(() => { if (!loading) inputRef.current?.focus() }, [loading])
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function loadAll() {
    try {
      const [chatData, msgsData, modelsData] = await Promise.all([
        api.getChat(chatId), api.listMessages(chatId), api.listModels(),
      ])
      setChat(chatData.chat)
      setMessages(msgsData.messages)
      setModels(modelsData.models?.map((m: any) => m.id) || [])
    } catch { toast.error("Failed to load chat") }
    finally { setLoading(false) }
  }

  async function changeModel(model: string) {
    try {
      await api.wsUpdateChat(wsId, chatId, { model })
      setChat((prev: any) => ({ ...prev, model }))
      setModelOpen(false)
      toast.success(`Model: ${model}`)
    } catch { toast.error("Failed to switch model") }
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    const userContent = input.trim()
    setInput(""); setSending(true); setStreamingContent("")
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: userContent, created_at: new Date().toISOString() }])
    try {
      const res = await api.wsSendMessage(wsId, chatId, {
        content: userContent, stream: true,
        model: chat?.model || undefined,
        temperature: chat?.temperature || 0.7, top_p: chat?.top_p || 0.95, max_tokens: chat?.max_tokens || 4096,
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try { const d = JSON.parse(line.slice(6)); if (d.done) break; if (d.content) { fullContent += d.content; setStreamingContent(fullContent) } } catch {}
          }
        }
      }
      if (fullContent) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: fullContent, created_at: new Date().toISOString() }])
        setStreamingContent("")
      }
    } catch { toast.error("Failed to send") }
    finally { setSending(false); inputRef.current?.focus() }
  }

  async function deleteChat() {
    try { await api.wsDeleteChat(wsId, chatId); toast.success("Deleted"); router.push(`/workspaces/${wsId}/chats`) }
    catch { toast.error("Failed") }
  }

  function exportChat() {
    const text = messages.map((m) => `## ${m.role === "user" ? "You" : "Assistant"}\n${m.content}`).join("\n\n")
    const blob = new Blob([text], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `${chat?.title || "chat"}.md`; a.click()
    URL.revokeObjectURL(url)
    toast.success("Exported")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); sendMessage()
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
        Loading...
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-background">
      <Toaster position="top-center" />

      {/* Header with model selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/workspaces/${wsId}/chats`)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <h1 className="text-sm font-medium truncate max-w-[200px]">{chat?.title || "Chat"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Model selector - Claude style */}
          <div className="relative" ref={modelRef}>
            <button
              onClick={() => setModelOpen(!modelOpen)}
              className="h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors border border-transparent hover:border-border"
            >
              <span className="max-w-[120px] truncate">{chat?.model || "Select model"}</span>
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
                        onClick={() => changeModel(m)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          chat?.model === m
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
          <button onClick={exportChat} className="h-7 px-2 rounded-lg text-xs text-muted-foreground hover:bg-muted flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={deleteChat} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[768px] mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-1">{chat?.title || "New conversation"}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask anything to your local AI assistant. Your data stays on your machine.
              </p>
              {chat?.model && (
                <p className="text-xs text-muted-foreground/60 mt-3">Using model: <span className="font-mono">{chat.model}</span></p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="chat-message">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "h-7 w-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5",
                  msg.role === "user" ? "bg-primary" : "bg-muted"
                )}>
                  {msg.role === "user"
                    ? <User className="h-4 w-4 text-primary-foreground" />
                    : <Bot className="h-4 w-4 text-foreground" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs text-muted-foreground mb-1.5">
                    {msg.role === "user" ? "You" : "Assistant"}
                  </div>
                  <div className="chat-message text-[15px] leading-7 whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {streamingContent && (
            <div className="chat-message">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-muted shrink-0 flex items-center justify-center mt-0.5">
                  <Bot className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs text-muted-foreground mb-1.5">Assistant</div>
                  <div className="chat-message text-[15px] leading-7 whitespace-pre-wrap">{streamingContent}</div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Generating...
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background">
        <div className="max-w-[768px] mx-auto px-4 py-3">
          <div className="relative flex items-end gap-2 bg-muted rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
            <Textarea
              ref={inputRef}
              placeholder="Message LocalGPT..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[24px] max-h-[200px] bg-transparent border-0 p-0 resize-none text-[15px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
              rows={1}
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="h-8 w-8 rounded-xl bg-primary disabled:opacity-30 flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
            LocalGPT Studio runs entirely offline. No data leaves your computer.
          </p>
        </div>
      </div>
    </div>
  )
}
