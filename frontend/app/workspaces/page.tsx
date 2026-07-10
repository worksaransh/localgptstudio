"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectItem } from "@/components/ui/select"
import { Plus, Search, Trash2, Briefcase, LayoutDashboard } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Toaster, toast } from "sonner"

interface Workspace {
  id: number
  name: string
  description: string
  category: string
  icon: string
  tags: string
  updated_at: string
}

const categories = ["General", "Personal", "Business", "Marketing", "Development", "Research", "Content", "Design"]

export default function WorkspacesPage() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", category: "General", icon: "Briefcase", tags: "" })

  useEffect(() => { loadWorkspaces() }, [])

  async function loadWorkspaces() {
    try {
      const data = await api.listWorkspaces(search || undefined)
      setWorkspaces(data.workspaces)
    } catch { toast.error("Failed to load workspaces") }
    finally { setLoading(false) }
  }

  useEffect(() => { loadWorkspaces() }, [search])

  async function createWorkspace() {
    if (!form.name.trim()) return
    try {
      const data = await api.createWorkspace(form)
      setShowDialog(false)
      setForm({ name: "", description: "", category: "General", icon: "Briefcase", tags: "" })
      toast.success("Workspace created")
      router.push(`/workspaces/${data.workspace.id}`)
    } catch { toast.error("Failed to create") }
  }

  async function deleteWorkspace(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    try {
      await api.deleteWorkspace(id)
      loadWorkspaces()
      toast.success("Workspace deleted")
    } catch { toast.error("Failed to delete") }
  }

  const icons: Record<string, string> = { Personal: "User", Business: "Briefcase", Marketing: "Megaphone", Development: "Code", Research: "Search", Content: "FileText", Design: "Palette", General: "LayoutDashboard" }

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border flex items-center gap-4">
        <h1 className="text-xl font-semibold flex-1">Workspaces</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search workspaces..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Workspace
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <LayoutDashboard className="h-12 w-12" />
            <p className="text-lg">No workspaces yet</p>
            <p className="text-sm">Create a workspace to organize your chats, documents, and agents</p>
            <Button onClick={() => setShowDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Create Workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <Card key={ws.id} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push(`/workspaces/${ws.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{ws.name}</CardTitle>
                        <CardDescription>{ws.description || ws.category}</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => deleteWorkspace(e, ws.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-secondary px-2 py-0.5 rounded">{ws.category}</span>
                    {ws.tags && ws.tags.split(",").map((t, i) => (
                      <span key={i} className="bg-secondary px-2 py-0.5 rounded">{t.trim()}</span>
                    ))}
                    <span className="ml-auto">{formatDate(ws.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader>
          <DialogTitle>New Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Workspace name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </Select>
          <Input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <Button onClick={createWorkspace} className="w-full">Create Workspace</Button>
        </div>
      </Dialog>
    </div>
  )
}
