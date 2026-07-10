"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Layers, Plus, Trash2, BrainCircuit, Search, Sparkles } from "lucide-react"
import { Toaster, toast } from "sonner"
import { formatDate } from "@/lib/utils"

const memoryTypes = ["general", "key_fact", "faq", "product", "service", "competitor", "number", "terminology", "procedure", "research_insight"]

const typeColors: Record<string, string> = {
  key_fact: "bg-blue-500/10 text-blue-600", faq: "bg-green-500/10 text-green-600",
  product: "bg-purple-500/10 text-purple-600", service: "bg-orange-500/10 text-orange-600",
  competitor: "bg-red-500/10 text-red-600", number: "bg-teal-500/10 text-teal-600",
  terminology: "bg-pink-500/10 text-pink-600", procedure: "bg-indigo-500/10 text-indigo-600",
  research_insight: "bg-yellow-500/10 text-yellow-600", general: "bg-gray-500/10 text-gray-600",
}

export default function WorkspaceMemory() {
  const params = useParams()
  const wsId = Number(params.id)
  const [memory, setMemory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [filter, setFilter] = useState("")
  const [form, setForm] = useState({ title: "", content: "", memory_type: "general", source: "manual", importance_score: 1 })

  useEffect(() => { loadMemory() }, [filter])

  async function loadMemory() {
    try { const d = await api.wsListMemory(wsId, filter || undefined); setMemory(d.memory) }
    catch { toast.error("Failed to load") }
    finally { setLoading(false) }
  }

  async function createMemory() {
    if (!form.content.trim()) return
    try {
      await api.wsCreateMemory(wsId, form)
      setShowDialog(false)
      setForm({ title: "", content: "", memory_type: "general", source: "manual", importance_score: 1 })
      toast.success("Memory saved")
      loadMemory()
    } catch { toast.error("Failed") }
  }

  async function deleteMemory(id: number) {
    try { await api.wsDeleteMemory(wsId, id); loadMemory(); toast.success("Deleted") }
    catch { toast.error("Failed") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-medium">Memory</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <select
              className="h-8 rounded-lg border border-input bg-transparent pl-8 pr-8 text-xs appearance-none cursor-pointer"
              value={filter} onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All types</option>
              {memoryTypes.map((t) => (<option key={t} value={t}>{t.replace("_", " ")}</option>))}
            </select>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Memory
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
        ) : memory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No memory yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">Upload documents to auto-extract knowledge, or add manually.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {memory.map((m) => (
              <Card key={m.id} className="p-4 border-border/60">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[m.memory_type] || typeColors.general}`}>{m.memory_type.replace("_", " ")}</span>
                    <span className="text-sm font-medium">{m.title || "Untitled"}</span>
                  </div>
                  <button onClick={() => deleteMemory(m.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center shrink-0">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{m.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {m.source && <span>Source: {m.source}</span>}
                  <span>Score: {m.importance_score}</span>
                  <span>{formatDate(m.created_at)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader><DialogTitle>Add Memory</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm" value={form.memory_type} onChange={(e) => setForm({ ...form, memory_type: e.target.value })}>
            {memoryTypes.map((t) => (<option key={t} value={t}>{t.replace("_", " ")}</option>))}
          </select>
          <Textarea placeholder="Content..." className="min-h-[100px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <Button onClick={createMemory} className="w-full">Save Memory</Button>
        </div>
      </Dialog>
    </div>
  )
}
