"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Database, Upload, Trash2, FileText, Plus, Loader2 } from "lucide-react"
import { Toaster, toast } from "sonner"
import { formatDate } from "@/lib/utils"

export default function WorkspaceDocuments() {
  const params = useParams()
  const wsId = Number(params.id)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    try { const d = await api.wsListDocuments(wsId); setDocuments(d.documents) }
    catch { toast.error("Failed to load") }
    finally { setLoading(false) }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(e.target.files)) {
        const result = await api.wsUploadDocument(wsId, file)
        toast.success(`${file.name} uploaded`)
      }
      loadDocs()
    } catch { toast.error("Upload failed") }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = "" }
  }

  async function deleteDoc(id: number) {
    try { await api.wsDeleteDocument(wsId, id); loadDocs(); toast.success("Deleted") }
    catch { toast.error("Failed") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-medium">Knowledge Base</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.xlsx,.csv,.txt,.md" className="hidden" onChange={handleUpload} />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
              Loading...
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Database className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">Upload PDFs, Word docs, Excel files, or text files to build your knowledge base.</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="mt-2">
              <Upload className="h-4 w-4 mr-1.5" /> Upload Files
            </Button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-4 space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-3 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">{doc.file_type?.replace(".", "").toUpperCase()} &middot; {formatDate(doc.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => deleteDoc(doc.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center shrink-0">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
