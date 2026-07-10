"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Bot, Plus, Pencil, Trash2, Play } from "lucide-react"
import { Toaster, toast } from "sonner"

export default function WorkspaceAgents() {
  const params = useParams()
  const router = useRouter()
  const wsId = Number(params.id)
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: "", description: "", model: "", system_prompt: "", temperature: 0.7 })

  useEffect(() => { loadAgents() }, [])

  async function loadAgents() {
    try { const d = await api.wsListAgents(wsId); setAgents(d.agents) }
    catch { toast.error("Failed to load") }
    finally { setLoading(false) }
  }

  async function saveAgent() {
    try {
      if (editing) { await api.wsUpdateAgent(wsId, editing.id, form); toast.success("Updated") }
      else { await api.wsCreateAgent(wsId, form); toast.success("Created") }
      setShowDialog(false); setEditing(null)
      setForm({ name: "", description: "", model: "", system_prompt: "", temperature: 0.7 })
      loadAgents()
    } catch { toast.error("Failed") }
  }

  async function deleteAgent(id: number) {
    try { await api.wsDeleteAgent(wsId, id); loadAgents(); toast.success("Deleted") }
    catch { toast.error("Failed") }
  }

  async function chatWithAgent(agent: any) {
    try {
      const d = await api.wsCreateChat(wsId, { title: `Agent: ${agent.name}`, model: agent.model, system_prompt: agent.system_prompt, agent_id: agent.id })
      router.push(`/workspaces/${wsId}/chats/${d.chat.id}`)
    } catch { toast.error("Failed") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-medium">Agents</h1>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ name: "", description: "", model: "", system_prompt: "", temperature: 0.7 }); setShowDialog(true) }}>
          <Plus className="h-4 w-4 mr-1.5" /> New Agent
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
              Loading...
            </div>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No agents</p>
            <p className="text-xs text-muted-foreground">Create specialized AI agents for this workspace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="p-4 border-border/60">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{agent.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  {agent.model && <span className="px-2 py-0.5 rounded bg-muted">{agent.model}</span>}
                  <span>Temp: {agent.temperature}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8" onClick={() => chatWithAgent(agent)}>
                    <Play className="h-3.5 w-3.5 mr-1.5" /> Chat
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setEditing(agent); setForm({ name: agent.name, description: agent.description, model: agent.model, system_prompt: agent.system_prompt, temperature: agent.temperature }); setShowDialog(true) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => deleteAgent(agent.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader><DialogTitle>{editing ? "Edit Agent" : "New Agent"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input placeholder="Model (e.g., qwen3-8b)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Textarea placeholder="System prompt..." value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Temperature: {form.temperature}</label>
            <Input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })} />
          </div>
          <Button onClick={saveAgent} className="w-full">{editing ? "Update" : "Create"} Agent</Button>
        </div>
      </Dialog>
    </div>
  )
}
