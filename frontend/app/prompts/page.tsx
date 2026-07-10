"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectItem } from "@/components/ui/select"
import { FileText, Plus, Pencil, Trash2, Copy } from "lucide-react"
import { Toaster, toast } from "sonner"

const categories = ["General", "Google Ads", "Meta Ads", "SEO", "Coding", "Numerology", "Real Estate", "Travel"]

interface Prompt {
  id: number
  title: string
  content: string
  category: string
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Prompt | null>(null)
  const [filter, setFilter] = useState("")
  const [form, setForm] = useState({ title: "", content: "", category: "General" })

  useEffect(() => { loadPrompts() }, [])

  async function loadPrompts() {
    try {
      const data = await api.listPrompts(filter || undefined)
      setPrompts(data.prompts)
    } catch { toast.error("Failed to load prompts") }
    finally { setLoading(false) }
  }

  useEffect(() => { loadPrompts() }, [filter])

  async function savePrompt() {
    try {
      if (editing) {
        await api.updatePrompt(editing.id, form)
        toast.success("Prompt updated")
      } else {
        await api.createPrompt(form)
        toast.success("Prompt created")
      }
      setShowDialog(false)
      setEditing(null)
      setForm({ title: "", content: "", category: "General" })
      loadPrompts()
    } catch { toast.error("Failed to save prompt") }
  }

  async function deletePrompt(id: number) {
    try {
      await api.deletePrompt(id)
      toast.success("Prompt deleted")
      loadPrompts()
    } catch { toast.error("Failed to delete") }
  }

  function editPrompt(p: Prompt) {
    setEditing(p)
    setForm({ title: p.title, content: p.content, category: p.category })
    setShowDialog(true)
  }

  function copyPrompt(content: string) {
    navigator.clipboard.writeText(content)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border flex items-center gap-4">
        <h1 className="text-xl font-semibold flex-1">Prompt Library</h1>
        <Select value={filter} onValueChange={setFilter} placeholder="All categories">
          <SelectItem value="">All</SelectItem>
          {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
        </Select>
        <Button onClick={() => { setEditing(null); setForm({ title: "", content: "", category: "General" }); setShowDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" /> New Prompt
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <FileText className="h-12 w-12" />
            <p>No prompts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{p.title}</CardTitle>
                      <span className="text-xs text-muted-foreground">{p.category}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyPrompt(p.content)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editPrompt(p)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePrompt(p.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-3">{p.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Prompt" : "New Prompt"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </Select>
          <Textarea placeholder="Prompt content..." className="min-h-[150px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <Button onClick={savePrompt} className="w-full">{editing ? "Update" : "Create"} Prompt</Button>
        </div>
      </Dialog>
    </div>
  )
}
