const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error: ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Models
  listModels: () => fetchApi("/models"),

  // ===== WORKSPACES =====
  listWorkspaces: (search?: string) =>
    fetchApi(`/workspaces${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createWorkspace: (data: any) =>
    fetchApi("/workspaces", { method: "POST", body: JSON.stringify(data) }),
  getWorkspace: (id: number) => fetchApi(`/workspaces/${id}`),
  updateWorkspace: (id: number, data: any) =>
    fetchApi(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWorkspace: (id: number) =>
    fetchApi(`/workspaces/${id}`, { method: "DELETE" }),
  getWorkspaceDashboard: (id: number) => fetchApi(`/workspaces/${id}/dashboard`),
  searchWorkspace: (id: number, q: string) =>
    fetchApi(`/workspaces/${id}/search?q=${encodeURIComponent(q)}`),

  // ===== WORKSPACE CHATS =====
  wsListChats: (wsId: number, search?: string) =>
    fetchApi(`/workspaces/${wsId}/chats${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  wsCreateChat: (wsId: number, data: any) =>
    fetchApi(`/workspaces/${wsId}/chats`, { method: "POST", body: JSON.stringify(data) }),
  wsGetChat: (wsId: number, chatId: number) => fetchApi(`/workspaces/${wsId}/chats/${chatId}`),
  wsUpdateChat: (wsId: number, chatId: number, data: any) =>
    fetchApi(`/workspaces/${wsId}/chats/${chatId}`, { method: "PATCH", body: JSON.stringify(data) }),
  wsDeleteChat: (wsId: number, chatId: number) =>
    fetchApi(`/workspaces/${wsId}/chats/${chatId}`, { method: "DELETE" }),
  wsListMessages: (wsId: number, chatId: number) => fetchApi(`/workspaces/${wsId}/chats/${chatId}/messages`),
  wsSendMessage: async (wsId: number, chatId: number, data: any) => {
    if (data.stream) {
      const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return res
    }
    return fetchApi(`/chats/${chatId}/messages`, { method: "POST", body: JSON.stringify(data) })
  },

  // ===== WORKSPACE MEMORY =====
  wsListMemory: (wsId: number, type?: string) =>
    fetchApi(`/workspaces/${wsId}/memory${type ? `?memory_type=${encodeURIComponent(type)}` : ""}`),
  wsCreateMemory: (wsId: number, data: any) =>
    fetchApi(`/workspaces/${wsId}/memory`, { method: "POST", body: JSON.stringify(data) }),
  wsExtractMemory: (wsId: number, text: string, source?: string) =>
    fetchApi(`/workspaces/${wsId}/memory/extract`, {
      method: "POST",
      body: JSON.stringify({ text, source }),
    }),
  wsDeleteMemory: (wsId: number, memoryId: number) =>
    fetchApi(`/workspaces/${wsId}/memory/${memoryId}`, { method: "DELETE" }),

  // ===== WORKSPACE DOCUMENTS =====
  wsListDocuments: (wsId: number) => fetchApi(`/workspaces/${wsId}/documents`),
  wsUploadDocument: async (wsId: number, file: File) => {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch(`${API_BASE}/api/workspaces/${wsId}/documents/upload`, {
      method: "POST",
      body: form,
    })
    if (!res.ok) throw new Error("Upload failed")
    return res.json()
  },
  wsDeleteDocument: (wsId: number, docId: number) =>
    fetchApi(`/workspaces/${wsId}/documents/${docId}`, { method: "DELETE" }),

  // ===== WORKSPACE AGENTS =====
  wsListAgents: (wsId: number) => fetchApi(`/workspaces/${wsId}/agents`),
  wsCreateAgent: (wsId: number, data: any) =>
    fetchApi(`/workspaces/${wsId}/agents`, { method: "POST", body: JSON.stringify(data) }),
  wsGetAgent: (wsId: number, agentId: number) => fetchApi(`/workspaces/${wsId}/agents/${agentId}`),
  wsUpdateAgent: (wsId: number, agentId: number, data: any) =>
    fetchApi(`/workspaces/${wsId}/agents/${agentId}`, { method: "PATCH", body: JSON.stringify(data) }),
  wsDeleteAgent: (wsId: number, agentId: number) =>
    fetchApi(`/workspaces/${wsId}/agents/${agentId}`, { method: "DELETE" }),

  // ===== WORKSPACE ASSETS =====
  wsListAssets: (wsId: number, type?: string) =>
    fetchApi(`/workspaces/${wsId}/assets${type ? `?asset_type=${encodeURIComponent(type)}` : ""}`),
  wsCreateAsset: (wsId: number, data: any) =>
    fetchApi(`/workspaces/${wsId}/assets`, { method: "POST", body: JSON.stringify(data) }),
  wsDeleteAsset: (wsId: number, assetId: number) =>
    fetchApi(`/workspaces/${wsId}/assets/${assetId}`, { method: "DELETE" }),

  // ===== WORKSPACE TASKS =====
  wsListTasks: (wsId: number, status?: string) =>
    fetchApi(`/workspaces/${wsId}/tasks${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  wsCreateTask: (wsId: number, data: any) =>
    fetchApi(`/workspaces/${wsId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
  wsUpdateTask: (wsId: number, taskId: number, data: any) =>
    fetchApi(`/workspaces/${wsId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
  wsDeleteTask: (wsId: number, taskId: number) =>
    fetchApi(`/workspaces/${wsId}/tasks/${taskId}`, { method: "DELETE" }),

  // ===== BROWSER =====
  browserSearch: (query: string, maxResults?: number) =>
    fetchApi("/browser/search", { method: "POST", body: JSON.stringify({ query, max_results: maxResults || 10 }) }),
  browserFetch: (url: string) =>
    fetchApi("/browser/fetch", { method: "POST", body: JSON.stringify({ url }) }),

  // ===== LEGACY (backward compat) =====
  listChats: (search?: string) =>
    fetchApi(`/chats${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createChat: (data: any) =>
    fetchApi("/chats", { method: "POST", body: JSON.stringify(data) }),
  getChat: (id: number) => fetchApi(`/chats/${id}`),
  updateChat: (id: number, data: any) =>
    fetchApi(`/chats/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteChat: (id: number) =>
    fetchApi(`/chats/${id}`, { method: "DELETE" }),
  listMessages: (chatId: number) => fetchApi(`/chats/${chatId}/messages`),
  sendMessage: async (chatId: number, data: any) => {
    if (data.stream) {
      const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return res
    }
    return fetchApi(`/chats/${chatId}/messages`, { method: "POST", body: JSON.stringify(data) })
  },
  deleteMessage: (chatId: number, messageId: number) =>
    fetchApi(`/chats/${chatId}/messages/${messageId}`, { method: "DELETE" }),
  listCollections: () => fetchApi("/collections"),
  createCollection: (data: any) =>
    fetchApi("/collections", { method: "POST", body: JSON.stringify(data) }),
  deleteCollection: (id: number) =>
    fetchApi(`/collections/${id}`, { method: "DELETE" }),
  listDocuments: (collectionId?: number) =>
    fetchApi(`/documents${collectionId ? `?collection_id=${collectionId}` : ""}`),
  uploadDocument: async (file: File, collectionId: number) => {
    const form = new FormData()
    form.append("file", file)
    form.append("collection_id", String(collectionId))
    const res = await fetch(`${API_BASE}/api/documents/upload`, { method: "POST", body: form })
    if (!res.ok) throw new Error("Upload failed")
    return res.json()
  },
  deleteDocument: (id: number) =>
    fetchApi(`/documents/${id}`, { method: "DELETE" }),
  listAgents: () => fetchApi("/agents"),
  createAgent: (data: any) =>
    fetchApi("/agents", { method: "POST", body: JSON.stringify(data) }),
  getAgent: (id: number) => fetchApi(`/agents/${id}`),
  updateAgent: (id: number, data: any) =>
    fetchApi(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAgent: (id: number) =>
    fetchApi(`/agents/${id}`, { method: "DELETE" }),
  listPrompts: (category?: string) =>
    fetchApi(`/prompts${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  createPrompt: (data: any) =>
    fetchApi("/prompts", { method: "POST", body: JSON.stringify(data) }),
  updatePrompt: (id: number, data: any) =>
    fetchApi(`/prompts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePrompt: (id: number) =>
    fetchApi(`/prompts/${id}`, { method: "DELETE" }),
  listImages: () => fetchApi("/images"),
  generateImage: (data: any) =>
    fetchApi("/images/generate", { method: "POST", body: JSON.stringify(data) }),
  deleteImage: (id: number) =>
    fetchApi(`/images/${id}`, { method: "DELETE" }),
  deepResearch: (query: string) =>
    fetchApi("/research/deep", { method: "POST", body: JSON.stringify({ query }) }),
  analyzeImage: async (file: File, prompt: string) => {
    const form = new FormData()
    form.append("file", file)
    form.append("prompt", prompt)
    const res = await fetch(`${API_BASE}/api/vision/analyze`, { method: "POST", body: form })
    if (!res.ok) throw new Error("Analysis failed")
    return res.json()
  },
  getSettings: () => fetchApi("/settings"),
  updateSetting: (key: string, value: string) =>
    fetchApi(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
  getProviderConfigs: () => fetchApi("/settings/providers"),
  updateProviderConfig: (name: string, data: any) =>
    fetchApi(`/settings/providers/${name}`, { method: "PUT", body: JSON.stringify(data) }),
  listProviders: () => fetchApi("/models/providers"),
  getMetrics: () => fetchApi("/admin/metrics"),
  getLogs: () => fetchApi("/admin/logs"),
}
