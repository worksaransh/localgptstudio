"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FolderOpen, Plus, Upload, Trash2, FileText } from "lucide-react"
import { Toaster, toast } from "sonner"

interface Collection {
  id: number
  name: string
  description: string
}

interface Document {
  id: number
  filename: string
  file_type: string
  created_at: string
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [collectionName, setCollectionName] = useState("")
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadCollections() }, [])

  async function loadCollections() {
    try {
      const data = await api.listCollections()
      setCollections(data.collections)
    } catch { toast.error("Failed to load collections") }
    finally { setLoading(false) }
  }

  async function loadDocuments(collectionId: number) {
    try {
      const data = await api.listDocuments(collectionId)
      setDocuments(data.documents)
      setSelectedCollection(collectionId)
    } catch { toast.error("Failed to load documents") }
  }

  async function createCollection() {
    if (!collectionName.trim()) return
    try {
      await api.createCollection({ name: collectionName.trim() })
      setShowDialog(false)
      setCollectionName("")
      toast.success("Collection created")
      loadCollections()
    } catch { toast.error("Failed to create collection") }
  }

  async function deleteCollection(id: number) {
    try {
      await api.deleteCollection(id)
      toast.success("Collection deleted")
      if (selectedCollection === id) { setSelectedCollection(null); setDocuments([]) }
      loadCollections()
    } catch { toast.error("Failed to delete") }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !selectedCollection) return
    setUploading(true)
    try {
      for (const file of Array.from(e.target.files)) {
        await api.uploadDocument(file, selectedCollection)
      }
      toast.success("Files uploaded")
      loadDocuments(selectedCollection)
    } catch { toast.error("Upload failed") }
    finally { setUploading(false) }
  }

  async function deleteDocument(id: number) {
    try {
      await api.deleteDocument(id)
      toast.success("Document deleted")
      if (selectedCollection) loadDocuments(selectedCollection)
    } catch { toast.error("Failed to delete") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border flex items-center">
        <h1 className="text-xl font-semibold flex-1">Collections</h1>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Collection
        </Button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r border-border overflow-auto p-4">
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : collections.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">No collections</div>
          ) : (
            <div className="space-y-2">
              {collections.map((col) => (
                <Card key={col.id} className={`cursor-pointer transition-colors ${selectedCollection === col.id ? "ring-2 ring-primary" : ""}`} onClick={() => loadDocuments(col.id)}>
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        <CardTitle className="text-sm">{col.name}</CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteCollection(col.id) }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    {col.description && <p className="text-xs text-muted-foreground mt-1">{col.description}</p>}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4">
          {selectedCollection ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="font-semibold">Documents</h2>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Upload Files"}
                  </Button>
                  <input type="file" multiple accept=".pdf,.docx,.xlsx,.csv,.txt" className="hidden" onChange={uploadFile} />
                </label>
              </div>
              {documents.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">No documents in this collection</div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardHeader className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{doc.filename}</span>
                            <span className="text-xs text-muted-foreground">{doc.file_type}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteDocument(doc.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a collection to view documents
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Collection name" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createCollection()} />
          <Button onClick={createCollection} className="w-full">Create</Button>
        </div>
      </Dialog>
    </div>
  )
}
