"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Bot, Plus, Pencil, Trash2, Play } from "lucide-react"
import { Toaster, toast } from "sonner"
import { useRouter } from "next/navigation"

interface Agent {
  id: number
  name: string
  description: string
  model: string
  system_prompt: string
  temperature: number
}

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [form, setForm] = useState({ name: "", description: "", model: "", system_prompt: "", temperature: 0.7 })

  useEffect(() => { loadAgents() }, [])

  async function loadAgents() {
    try {
      const data = await api.listAgents()
      setAgents(data.agents)
    } catch { toast.error("Failed to load agents") }
    finally { setLoading(false) }
  }

  async function saveAgent() {
    try {
      if (editing) {
        await api.updateAgent(editing.id, form)
        toast.success("Agent updated")
      } else {
        await api.createAgent(form)
        toast.success("Agent created")
      }
      setShowDialog(false)
      setEditing(null)
      setForm({ name: "", description: "", model: "", system_prompt: "", temperature: 0.7 })
      loadAgents()
    } catch { toast.error("Failed to save agent") }
  }

  async function deleteAgent(id: number) {
    try {
      await api.deleteAgent(id)
      toast.success("Agent deleted")
      loadAgents()
    } catch { toast.error("Failed to delete") }
  }

  function editAgent(agent: Agent) {
    setEditing(agent)
    setForm({ name: agent.name, description: agent.description, model: agent.model, system_prompt: agent.system_prompt, temperature: agent.temperature })
    setShowDialog(true)
  }

  async function chatWithAgent(agent: Agent) {
    try {
      const data = await api.createChat({ title: `Agent: ${agent.name}`, model: agent.model, system_prompt: agent.system_prompt, agent_id: agent.id })
      router.push(`/chat/${data.chat.id}`)
    } catch { toast.error("Failed to create chat") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border flex items-center">
        <h1 className="text-xl font-semibold flex-1">AI Agents</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", model: "", system_prompt: "", temperature: 0.7 }); setShowDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" /> New Agent
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Bot className="h-12 w-12" />
            <p>No agents yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" /> {agent.name}
                      </CardTitle>
                      <CardDescription>{agent.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-3">
                    Model: {agent.model || "Default"}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => chatWithAgent(agent)}>
                      <Play className="h-4 w-4 mr-1" /> Chat
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => editAgent(agent)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteAgent(agent.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Agent" : "New Agent"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Agent name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input placeholder="Model (e.g., qwen3-8b)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <div>
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea placeholder="System prompt for this agent..." value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Temperature: {form.temperature}</label>
            <Input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })} />
          </div>
          <Button onClick={saveAgent} className="w-full">{editing ? "Update" : "Create"} Agent</Button>
        </div>
      </Dialog>
    </div>
  )
}
