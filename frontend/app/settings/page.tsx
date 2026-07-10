"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Settings, Save, Server, Key, Globe, Cpu, Bot } from "lucide-react"
import { Toaster, toast } from "sonner"

interface ProviderInfo {
  base_url?: string
  api_key_set?: boolean
  enabled?: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({})
  const [providerForms, setProviderForms] = useState<Record<string, { base_url: string; api_key: string; enabled: boolean }>>({})

  const defaultSettings = {
    context_length: "8192",
    temperature: "0.7",
    top_p: "0.95",
    max_tokens: "4096",
    gpu_layers: "32",
    embedding_model: "BGE Small",
  }

  useEffect(() => {
    loadSettings()
    loadProviders()
  }, [])

  async function loadSettings() {
    try {
      const data = await api.getSettings()
      setSettings({ ...defaultSettings, ...data.settings })
    } catch { setSettings(defaultSettings) }
    finally { setLoading(false) }
  }

  async function loadProviders() {
    try {
      const data = await api.getProviderConfigs()
      setProviders(data.providers || {})
      const forms: Record<string, any> = {}
      for (const [name, info] of Object.entries(data.providers || {})) {
        forms[name] = {
          base_url: (info as any).base_url || "",
          api_key: "",
          enabled: (info as any).enabled !== false,
        }
      }
      setProviderForms(forms)
    } catch {}
  }

  async function saveSetting(key: string, value: string) {
    try {
      await api.updateSetting(key, value)
      setSettings((prev) => ({ ...prev, [key]: value }))
      toast.success(`${key} updated`)
    } catch { toast.error("Failed to save") }
  }

  async function saveProvider(name: string) {
    const form = providerForms[name]
    if (!form) return
    try {
      const data = await api.updateProviderConfig(name, {
        base_url: form.base_url || undefined,
        api_key: form.api_key || undefined,
        enabled: form.enabled,
      })
      setProviders((prev) => ({ ...prev, [name]: data.config }))
      setProviderForms((prev) => ({
        ...prev,
        [name]: { ...prev[name], api_key: "" },
      }))
      toast.success(`${name} provider updated`)
    } catch { toast.error("Failed to save provider") }
  }

  const providerMeta: Record<string, { icon: any; title: string; defaultUrl: string }> = {
    lm_studio: { icon: Server, title: "LM Studio (Local)", defaultUrl: "http://localhost:1234/v1" },
    openai: { icon: Globe, title: "OpenAI / OpenRouter / Groq", defaultUrl: "https://api.openai.com/v1" },
    anthropic: { icon: Bot, title: "Anthropic Claude", defaultUrl: "https://api.anthropic.com/v1" },
    google: { icon: Cpu, title: "Google Gemini", defaultUrl: "https://generativelanguage.googleapis.com/v1beta" },
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster />
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" /> Settings
        </h1>
      </div>
      <div className="flex-1 overflow-auto p-4 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* AI Providers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" /> AI Providers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(providerMeta).map(([name, meta]) => {
                  const Icon = meta.icon
                  const form = providerForms[name]
                  if (!form) return null
                  return (
                    <div key={name} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{meta.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {form.enabled ? "Enabled" : "Disabled"}
                          </span>
                          <Switch
                            checked={form.enabled}
                            onCheckedChange={(v) => {
                              setProviderForms((prev) => ({
                                ...prev,
                                [name]: { ...prev[name], enabled: v },
                              }))
                            }}
                          />
                        </div>
                      </div>
                      {name !== "lm_studio" && (
                        <div>
                          <label className="text-xs font-medium">API Key</label>
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              placeholder={providers[name]?.api_key_set ? "Key saved (enter to change)" : "Enter API key..."}
                              value={form.api_key}
                              onChange={(e) =>
                                setProviderForms((prev) => ({
                                  ...prev,
                                  [name]: { ...prev[name], api_key: e.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium">Base URL</label>
                        <Input
                          value={form.base_url}
                          placeholder={meta.defaultUrl}
                          onChange={(e) =>
                            setProviderForms((prev) => ({
                              ...prev,
                              [name]: { ...prev[name], base_url: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <Button size="sm" onClick={() => saveProvider(name)} className="gap-1">
                        <Save className="h-3.5 w-3.5" /> Save Provider
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Generation Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Generation Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Context Length</label>
                    <Input type="number" value={settings.context_length || defaultSettings.context_length} onChange={(e) => saveSetting("context_length", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Temperature</label>
                    <Input type="number" step="0.1" min="0" max="2" value={settings.temperature || defaultSettings.temperature} onChange={(e) => saveSetting("temperature", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Top P</label>
                    <Input type="number" step="0.05" min="0" max="1" value={settings.top_p || defaultSettings.top_p} onChange={(e) => saveSetting("top_p", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Tokens</label>
                    <Input type="number" value={settings.max_tokens || defaultSettings.max_tokens} onChange={(e) => saveSetting("max_tokens", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hardware */}
            <Card>
              <CardHeader>
                <CardTitle>Hardware</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">GPU Layers</label>
                    <Input type="number" value={settings.gpu_layers || defaultSettings.gpu_layers} onChange={(e) => saveSetting("gpu_layers", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Embedding Model</label>
                    <Input value={settings.embedding_model || defaultSettings.embedding_model} onChange={(e) => saveSetting("embedding_model", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
