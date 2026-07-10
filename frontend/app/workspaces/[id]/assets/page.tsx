"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Plus, Trash2, Search } from "lucide-react"
import { Toaster, toast } from "sonner"
import { formatDate } from "@/lib/utils"

const assetTypes = ["document", "report", "research", "image", "presentation", "ad_copy", "blog", "code", "dataset"]

export default function WorkspaceAssets() {
  const params = useParams()
  const wsId = Number(params.id)
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [filter, setFilter] = useState("")
  const [form, setForm] = useState({ name: "", description: "", asset_type: "document", content: "", source: "" })

  useEffect(() => { loadAssets() }, [filter])

  async function loadAssets() {
    try { const d = await api.wsListAssets(wsId, filter || undefined); setAssets(d.assets) }
    catch { toast.error("Failed to load") }
    finally { setLoading(false) }
  }

  async function createAsset() {
    if (!form.name.trim()) return
    try { await api.wsCreateAsset(wsId, form); setShowDialog(false); setForm({ name: "", description: "", asset_type: "document", content: "", source: "" }); toast.success("Asset created"); loadAssets() }
    catch { toast.error("Failed") }
  }

  async function deleteAsset(id: number) {
    try { await api.wsDeleteAsset(wsId, id); loadAssets(); toast.success("Deleted") }
    catch { toast.error("Failed") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-medium">Assets</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <select
              className="h-8 rounded-lg border border-input bg-transparent pl-8 pr-8 text-xs appearance-none cursor-pointer"
              value={filter} onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All types</option>
              {assetTypes.map((t) => (<option key={t} value={t}>{t.replace("_", " ")}</option>))}
            </select>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Asset
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
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No assets yet</p>
            <p className="text-xs text-muted-foreground">Create documents, reports, and other assets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assets.map((a) => (
              <Card key={a.id} className="p-4 border-border/60">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <span className="text-xs text-muted-foreground">{a.asset_type.replace("_", " ")}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteAsset(a.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center shrink-0">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                {a.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{a.description}</p>}
                <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader><DialogTitle>New Asset</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Asset name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
            {assetTypes.map((t) => (<option key={t} value={t}>{t.replace("_", " ")}</option>))}
          </select>
          <Textarea placeholder="Content..." className="min-h-[100px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <Input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <Button onClick={createAsset} className="w-full">Create Asset</Button>
        </div>
      </Dialog>
    </div>
  )
}
