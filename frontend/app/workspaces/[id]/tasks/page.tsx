"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ListChecks, Plus, Trash2, CheckCircle2, Clock, AlertCircle, Search } from "lucide-react"
import { Toaster, toast } from "sonner"
import { formatDate } from "@/lib/utils"

const priorities = ["low", "medium", "high", "critical"]
const statuses = ["pending", "in_progress", "completed", "cancelled"]

const priorityColors: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-600", medium: "bg-blue-500/10 text-blue-600",
  high: "bg-orange-500/10 text-orange-600", critical: "bg-red-500/10 text-red-600",
}
const statusIcons: Record<string, any> = { pending: Clock, in_progress: AlertCircle, completed: CheckCircle2, cancelled: Clock }

export default function WorkspaceTasks() {
  const params = useParams()
  const wsId = Number(params.id)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [filter, setFilter] = useState("")
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" })

  useEffect(() => { loadTasks() }, [filter])

  async function loadTasks() {
    try { const d = await api.wsListTasks(wsId, filter || undefined); setTasks(d.tasks) }
    catch { toast.error("Failed to load") }
    finally { setLoading(false) }
  }

  async function createTask() {
    if (!form.title.trim()) return
    try { await api.wsCreateTask(wsId, form); setShowDialog(false); setForm({ title: "", description: "", priority: "medium" }); toast.success("Task created"); loadTasks() }
    catch { toast.error("Failed") }
  }

  async function updateTaskStatus(taskId: number, status: string) {
    try { await api.wsUpdateTask(wsId, taskId, { status }); loadTasks() }
    catch { toast.error("Failed") }
  }

  async function deleteTask(id: number) {
    try { await api.wsDeleteTask(wsId, id); loadTasks(); toast.success("Deleted") }
    catch { toast.error("Failed") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-medium">Tasks</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <select
              className="h-8 rounded-lg border border-input bg-transparent pl-8 pr-8 text-xs appearance-none cursor-pointer"
              value={filter} onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
            </select>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Task
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
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No tasks yet</p>
            <p className="text-xs text-muted-foreground">Track work items and to-dos for this workspace.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {tasks.map((task) => {
              const StatusIcon = statusIcons[task.status] || Clock
              return (
                <Card key={task.id} className="p-4 border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <StatusIcon className={`h-4 w-4 shrink-0 ${task.status === "completed" ? "text-green-500" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <span className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                        <span className={`text-xs ml-2 px-1.5 py-0.5 rounded font-medium ${priorityColors[task.priority] || priorityColors.medium}`}>{task.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        className="h-7 rounded border border-input bg-transparent px-2 text-xs"
                        value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                      >
                        {statuses.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
                      </select>
                      <button onClick={() => deleteTask(task.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                  {task.description && <p className="text-xs text-muted-foreground mt-2 ml-6.5">{task.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1 ml-6.5">{formatDate(task.created_at)}</p>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {priorities.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
          <Button onClick={createTask} className="w-full">Create Task</Button>
        </div>
      </Dialog>
    </div>
  )
}
