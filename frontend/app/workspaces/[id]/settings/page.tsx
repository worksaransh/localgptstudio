"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { Save, Trash2, Settings } from "lucide-react"
import { Toaster, toast } from "sonner"

const categories = ["General", "Personal", "Business", "Marketing", "Development", "Research", "Content", "Design"]

export default function WorkspaceSettings() {
  const params = useParams()
  const router = useRouter()
  const wsId = Number(params.id)
  const [workspace, setWorkspace] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: "", description: "", category: "General", tags: "", default_model: "" })

  useEffect(() => { loadWorkspace() }, [wsId])

  async function loadWorkspace() {
    try {
      const d = await api.getWorkspace(wsId)
      setWorkspace(d.workspace)
      setForm({ name: d.workspace.name, description: d.workspace.description || "", category: d.workspace.category, tags: d.workspace.tags || "", default_model: d.workspace.default_model || "" })
    } catch { toast.error("Failed to load") }
    finally { setLoading(false) }
  }

  async function saveSettings() {
    try {
      await api.updateWorkspace(wsId, form)
      toast.success("Settings saved")
      loadWorkspace()
    } catch { toast.error("Failed to save") }
  }

  async function deleteWorkspace() {
    if (!confirm("Delete this workspace and all its data?")) return
    try { await api.deleteWorkspace(wsId); toast.success("Deleted"); router.push("/workspaces") }
    catch { toast.error("Failed") }
  }

  if (loading) return <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> Workspace Settings</h1>
      </div>
      <div className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full space-y-6">
        <Card>
          <CardHeader><CardTitle>General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma separated)</label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Default Model</label>
              <Input value={form.default_model} onChange={(e) => setForm({ ...form, default_model: e.target.value })} placeholder="e.g., qwen3-8b" />
            </div>
            <Button onClick={saveSettings} className="w-full"><Save className="h-4 w-4 mr-2" /> Save Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Delete this workspace and all its contents permanently.</p>
            <Button variant="destructive" onClick={deleteWorkspace}><Trash2 className="h-4 w-4 mr-2" /> Delete Workspace</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
