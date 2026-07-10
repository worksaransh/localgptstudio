"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImageIcon, Sparkles, Trash2 } from "lucide-react"
import { Toaster, toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface Image {
  id: number
  prompt: string
  model: string
  filepath: string
  width: number
  height: number
  created_at: string
}

export default function ImagesPage() {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [model, setModel] = useState("")

  useEffect(() => { loadImages() }, [])

  async function loadImages() {
    try {
      const data = await api.listImages()
      setImages(data.images)
    } catch { toast.error("Failed to load images") }
    finally { setLoading(false) }
  }

  async function generateImage() {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    try {
      await api.generateImage({ prompt, negative_prompt: negativePrompt, model })
      toast.success("Image generated")
      setPrompt("")
      setNegativePrompt("")
      loadImages()
    } catch { toast.error("Generation failed") }
    finally { setGenerating(false) }
  }

  async function deleteImage(id: number) {
    try {
      await api.deleteImage(id)
      toast.success("Image deleted")
      loadImages()
    } catch { toast.error("Failed to delete") }
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold mb-4">Image Generation</h1>
        <div className="flex gap-4 max-w-4xl">
          <div className="flex-1 space-y-2">
            <Textarea placeholder="Describe the image you want to generate..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[80px]" />
            <Input placeholder="Negative prompt (optional)" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} />
            <Input placeholder="Model (e.g., flux-schnell)" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <Button onClick={generateImage} disabled={generating || !prompt.trim()} className="self-end">
            <Sparkles className="h-4 w-4 mr-2" /> {generating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
            <p>No images yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <Card key={img.id}>
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={`/api/images/${img.filepath}`}
                    alt={img.prompt}
                    className="object-cover w-full h-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                  />
                </div>
                <CardContent className="p-2">
                  <p className="text-xs truncate">{img.prompt}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{formatDate(img.created_at)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteImage(img.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
