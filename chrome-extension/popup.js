// State
let serverUrl = 'http://localhost:8000'
let workspaces = []
let selectedWorkspaceId = null
let pageContent = ''

// DOM refs
const statusDot = document.getElementById('statusDot')
const tabs = document.querySelectorAll('.tab')
const panels = {
  chat: document.getElementById('panel-chat'),
  page: document.getElementById('panel-page'),
  settings: document.getElementById('panel-settings'),
}
const chatInput = document.getElementById('chatInput')
const chatSend = document.getElementById('chatSend')
const chatResponse = document.getElementById('chatResponse')
const summarizeBtn = document.getElementById('summarizeBtn')
const saveMemoryBtn = document.getElementById('saveMemoryBtn')
const pageQuestion = document.getElementById('pageQuestion')
const askPageBtn = document.getElementById('askPageBtn')
const pageResponse = document.getElementById('pageResponse')
const serverUrlInput = document.getElementById('serverUrl')
const workspaceSelect = document.getElementById('workspaceSelect')
const saveSettings = document.getElementById('saveSettings')
const savedMsg = document.getElementById('savedMsg')

// Init
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const saved = await chrome.storage.local.get(['serverUrl', 'workspaceId'])
  if (saved.serverUrl) serverUrl = saved.serverUrl
  if (saved.serverUrl) serverUrlInput.value = saved.serverUrl
  if (saved.workspaceId) selectedWorkspaceId = saved.workspaceId

  checkConnection()
  loadWorkspaces()

  // Get current page content
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const article = document.querySelector('article') || document.querySelector('main') || document.body
          return {
            title: document.title,
            content: article?.innerText?.slice(0, 10000) || '',
            url: window.location.href,
          }
        },
      })
      if (result?.[0]?.result) {
        pageContent = result[0].result
      }
    } catch {}
  }
})

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    Object.entries(panels).forEach(([key, panel]) => {
      panel.classList.toggle('active', key === tab.dataset.tab)
    })
  })
})

// Check connection to server
async function checkConnection() {
  statusDot.className = 'status checking'
  try {
    const resp = await fetch(`${serverUrl}/api/models`, { signal: AbortSignal.timeout(3000) })
    if (resp.ok) statusDot.className = 'status connected'
    else statusDot.className = 'status disconnected'
  } catch {
    statusDot.className = 'status disconnected'
  }
}

// Load workspaces
async function loadWorkspaces() {
  try {
    const resp = await fetch(`${serverUrl}/api/workspaces`)
    if (!resp.ok) return
    const data = await resp.json()
    workspaces = data.workspaces || []
    workspaceSelect.innerHTML = '<option value="">None (use chat API)</option>'
    workspaces.forEach(ws => {
      const opt = document.createElement('option')
      opt.value = ws.id
      opt.textContent = ws.name
      if (ws.id === selectedWorkspaceId) opt.selected = true
      workspaceSelect.appendChild(opt)
    })
  } catch {
    workspaceSelect.innerHTML = '<option value="">Cannot reach server</option>'
  }
}

// === Quick Chat ===
chatSend.addEventListener('click', sendChatMessage)
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() }
})

async function sendChatMessage() {
  const text = chatInput.value.trim()
  if (!text) return
  chatResponse.style.display = 'block'
  chatResponse.textContent = 'Thinking...'
  chatResponse.className = 'response-box loading'
  chatSend.disabled = true

  try {
    const resp = await fetch(`${serverUrl}/api/chats/0/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, stream: true, temperature: 0.7, top_p: 0.95, max_tokens: 2048 }),
    })
    const reader = resp.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    chatResponse.className = 'response-box'
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6))
            if (d.done) break
            if (d.content) { full += d.content; chatResponse.textContent = full }
          } catch {}
        }
      }
    }
    chatInput.value = ''
  } catch {
    chatResponse.textContent = 'Error: Cannot reach LocalGPT server. Make sure it is running on port 8000.'
  }
  chatSend.disabled = false
}

// === Page Actions ===
summarizeBtn.addEventListener('click', async () => {
  if (!pageContent?.content) {
    pageResponse.style.display = 'block'
    pageResponse.textContent = 'No page content available. Try refreshing.'
    return
  }
  pageResponse.style.display = 'block'
  pageResponse.textContent = 'Summarizing...'
  pageResponse.className = 'response-box loading'
  summarizeBtn.disabled = true

  try {
    const resp = await fetch(`${serverUrl}/api/chats/0/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Summarize the following page content in 3-5 bullet points:\n\nTitle: ${pageContent.title}\nURL: ${pageContent.url}\n\n${pageContent.content.slice(0, 6000)}`,
        stream: true, temperature: 0.5, max_tokens: 1024,
      }),
    })
    const reader = resp.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    pageResponse.className = 'response-box'
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6))
            if (d.done) break
            if (d.content) { full += d.content; pageResponse.textContent = full }
          } catch {}
        }
      }
    }
  } catch {
    pageResponse.textContent = 'Error: Cannot reach LocalGPT server.'
  }
  summarizeBtn.disabled = false
})

saveMemoryBtn.addEventListener('click', async () => {
  if (!pageContent?.content || !selectedWorkspaceId) {
    pageResponse.style.display = 'block'
    pageResponse.textContent = selectedWorkspaceId ? 'No page content available.' : 'Select a workspace in Settings first.'
    return
  }
  pageResponse.style.display = 'block'
  pageResponse.textContent = 'Saving...'
  saveMemoryBtn.disabled = true

  try {
    const resp = await fetch(`${serverUrl}/api/workspaces/${selectedWorkspaceId}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Browser: ${pageContent.title}`,
        content: pageContent.content.slice(0, 5000),
        memory_type: 'key_fact',
        source: pageContent.url,
      }),
    })
    if (resp.ok) pageResponse.textContent = 'Saved to workspace memory!'
    else pageResponse.textContent = 'Failed to save.'
  } catch {
    pageResponse.textContent = 'Error: Cannot reach server.'
  }
  saveMemoryBtn.disabled = false
})

askPageBtn.addEventListener('click', askAboutPage)
pageQuestion.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAboutPage() }
})

async function askAboutPage() {
  const question = pageQuestion.value.trim()
  if (!question || !pageContent?.content) return
  pageResponse.style.display = 'block'
  pageResponse.textContent = 'Thinking...'
  pageResponse.className = 'response-box loading'
  askPageBtn.disabled = true

  try {
    const resp = await fetch(`${serverUrl}/api/chats/0/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Context from page "${pageContent.title}":\n${pageContent.content.slice(0, 5000)}\n\nQuestion: ${question}`,
        stream: true, temperature: 0.5, max_tokens: 1024,
      }),
    })
    const reader = resp.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    pageResponse.className = 'response-box'
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6))
            if (d.done) break
            if (d.content) { full += d.content; pageResponse.textContent = full }
          } catch {}
        }
      }
    }
  } catch {
    pageResponse.textContent = 'Error: Cannot reach LocalGPT server.'
  }
  askPageBtn.disabled = false
}

// === Settings ===
saveSettings.addEventListener('click', async () => {
  serverUrl = serverUrlInput.value.trim()
  selectedWorkspaceId = workspaceSelect.value ? Number(workspaceSelect.value) : null
  await chrome.storage.local.set({
    serverUrl,
    workspaceId: selectedWorkspaceId,
  })
  savedMsg.textContent = 'Settings saved!'
  setTimeout(() => { savedMsg.textContent = '' }, 2000)
  checkConnection()
  loadWorkspaces()
})
