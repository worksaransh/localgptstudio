# LocalGPT Studio

> A self-hosted, provider-agnostic AI operating system — combining a ChatGPT-class chat interface with workspaces, agents, RAG knowledge bases, memory management, browser automation, and a Chrome extension. Supports local LLMs (LM Studio, Ollama, vLLM) and cloud APIs (OpenAI, Anthropic, Google Gemini, OpenRouter, Groq) through a unified adapter layer.

---

## Features

### Multi-Provider AI Engine
- **4 built-in adapters**: LM Studio (local), OpenAI-compatible (OpenAI / OpenRouter / Groq), Anthropic Claude, Google Gemini
- **Provider registry** with auto-routing — messages are sent to the correct provider based on the model name
- Configure all providers from the Settings UI; enable/disable toggle per provider
- API keys stored encrypted via the settings database

### Workspaces
- Isolated environments with their own chats, documents, agents, memory, assets, and tasks
- Pre-seeded workspaces: Personal, Business, Marketing, Development
- Dashboard view with per-workspace stats and activity

### Chat
- Real-time streaming responses from any provider
- Per-chat model selection with Claude-style dropdown
- RAG (Retrieval-Augmented Generation) toggle — query your knowledge base while chatting
- Markdown export, chat history, system prompts
- Adjustable temperature, top-p, max tokens per chat

### Knowledge Base (RAG)
- Upload documents (PDF, DOCX, TXT) per workspace
- ChromaDB vector store for semantic search
- LangChain text splitting with configurable chunk size
- Automatic relevance retrieval during chat (when RAG is enabled)

### Memory
- Global workspace memory and chat-specific memory
- AI-powered memory extraction from conversations
- Persistent storage across sessions

### Agents
- Pre-built agents per workspace (Research Analyst, Content Writer, Code Assistant, etc.)
- Custom system prompts, temperature, and model selection per agent
- Agents can be assigned to chats

### Browser Activity
- Built-in DuckDuckGo search from within the app
- Webpage content extraction and AI analysis
- Use any provider model for browser-based AI tasks

### Image Generation
- ComfyUI integration for local image generation
- Prompt library and generation history

### Deep Research
- AI-powered deep research on any topic
- Multi-step research gathering and synthesis

### Chrome Extension
- **Quick Chat** — open LocalGPT from any webpage
- **Summarize** — right-click or FAB to summarize the current page
- **Ask** — ask questions about the current page content
- **Save to Memory** — save page content to workspace memory
- Floating action button on every page
- Context menu integration

### Admin Dashboard
- API metrics and usage tracking
- Request logs with token counting

### Tech Stack
- **Backend**: Python FastAPI, SQLAlchemy, SQLite (WAL mode), ChromaDB, httpx
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide icons
- **Extension**: Chrome Manifest V3, vanilla JS
- **Design**: Dark/light mode, glassmorphism, responsive layout, smooth animations

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
│  (context menus, FAB, summarize, save to memory)            │
└──────────┬───────────────────────────────────────────────────┘
           │ HTTP
┌──────────▼───────────────────────────────────────────────────┐
│              Next.js Frontend (port 3000)                    │
│  Workspaces │ Chats │ Knowledge │ Memory │ Agents │ Browser  │
│  Settings │ Prompts │ Images │ Research │ Admin              │
└──────────┬───────────────────────────────────────────────────┘
           │ API calls
┌──────────▼───────────────────────────────────────────────────┐
│              FastAPI Backend (port 8000)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Provider Registry                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────┐ │    │
│  │  │LM Studio │  │ OpenAI   │  │Anthropic │  │Google│ │    │
│  │  │ (local)  │  │ Compat   │  │ Claude   │  │Gemini│ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌──────┐ ┌───────┐ ┌────────┐ ┌─────────┐ ┌───────────┐  │
│  │Chat  │ │Memory │ │Knowledge│ │Browser  │ │Agents     │  │
│  │Engine│ │Service│ │Base RAG │ │Service  │ │ & Tasks   │  │
│  └──────┘ └───────┘ └────────┘ └─────────┘ └───────────┘  │
│  ┌──────────┐ ┌────────────┐                                │
│  │SQLite DB │ │ ChromaDB   │                                │
│  │(SQLAlch.)│ │(Vector DB) │                                │
│  └──────────┘ └────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) LM Studio running on `http://localhost:1234` for local inference
- (Optional) API keys for OpenAI / Anthropic / Google if using cloud providers

### 1. Clone and Install Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Install and Run Frontend

```bash
cd frontend
npm install
npx next dev -p 3000
```

### 3. Open the App
Navigate to **http://localhost:3000**

---

## Configuration

### Provider Setup

Open **Settings** → **AI Providers** to configure:

| Provider | Type | Default URL | Requires API Key |
|----------|------|-------------|------------------|
| LM Studio | Local | `http://localhost:1234/v1` | No |
| OpenAI / OpenRouter / Groq | Cloud | `https://api.openai.com/v1` | Yes |
| Anthropic Claude | Cloud | `https://api.anthropic.com/v1` | Yes |
| Google Gemini | Cloud | `https://generativelanguage.googleapis.com/v1beta` | Yes |

Toggle each provider on/off independently. API keys are persisted in the database.

### Environment Variables

Set via environment or through the Settings UI:

| Variable | Default | Description |
|----------|---------|-------------|
| `LM_STUDIO_URL` | `http://localhost:1234/v1` | Local LLM endpoint |
| `OPENAI_API_KEY` | — | OpenAI / OpenRouter / Groq API key |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Change to `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`, or `https://api.groq.com/openai/v1` |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `GOOGLE_API_KEY` | — | Google Gemini API key |

### Generation Parameters

Configure defaults in **Settings** → **Generation Parameters**:
- Context Length, Temperature, Top P, Max Tokens, GPU Layers, Embedding Model

---

## Usage Guide

### Creating a Workspace
1. Click the **+** icon in the sidebar header or go to `/workspaces`
2. Set a name, description, and category
3. Navigate into the workspace to access its chats, documents, agents, and memory

### Chatting with AI
1. Open a workspace → **Chats** → **New Chat**
2. Select a model from the dropdown in the header
3. Type your message and press Enter
4. Toggle **RAG** to search the workspace knowledge base during chat

### Uploading Documents (RAG)
1. Open a workspace → **Knowledge**
2. Upload PDF, DOCX, or TXT files
3. Documents are automatically chunked and embedded into ChromaDB
4. Enable RAG in any chat to query this knowledge base

### Using Memory
1. Open a workspace → **Memory**
2. View all saved memories, or use **Extract** to automatically generate memories from text
3. Global memory persists across all chats in the workspace

### Browser Automation
1. Open a workspace → **Browser**
2. Search the web via DuckDuckGo or fetch a specific URL
3. Select a model and have AI analyze the page content

### Chrome Extension
1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** and select `D:\bot\chrome-extension`
4. The FAB appears on every webpage. Right-click for context menu actions
5. Configure the backend URL in extension Settings (default: `http://localhost:8000`)

---

## API Reference

The backend exposes 66 REST endpoints across 21 route files:

| Route Group | Prefix | Endpoints |
|-------------|--------|-----------|
| **Workspaces** | `/api/workspaces` | CRUD, dashboard, search |
| **Chats** | `/api/chats`, `/api/workspaces/{ws}/chats` | CRUD, messages, streaming |
| **Knowledge** | `/api/collections`, `/api/documents` | Upload, chunk, embed, search |
| **Memory** | `/api/workspaces/{ws}/memory` | CRUD, extract, global mem |
| **Agents** | `/api/agents`, `/api/workspaces/{ws}/agents` | CRUD, assign |
| **Models** | `/api/models` | List models, list providers |
| **Settings** | `/api/settings` | Get/set settings, providers |
| **Browser** | `/api/browser` | Search, fetch |
| **Images** | `/api/images` | Generate, list, delete |
| **Research** | `/api/research` | Deep research |
| **Vision** | `/api/vision` | Image analysis |
| **Admin** | `/api/admin` | Metrics, logs |
| **Tasks** | `/api/workspaces/{ws}/tasks` | CRUD |
| **Assets** | `/api/workspaces/{ws}/assets` | CRUD |

---

## Development

### Backend

```bash
cd backend
python -m uvicorn main:app --reload  # Auto-reload on file changes
```

### Frontend

```bash
cd frontend
npm run dev     # Development with hot reload
npm run build   # Production build
npm run lint    # Lint check
```

### Architecture Notes

- **Provider abstraction** is in `backend/services/providers/` — add a new provider by extending `BaseProvider` and registering it in `registry.py`
- **Database** is SQLite with WAL mode (for concurrent reads)
- **Vector store** is ChromaDB (persistent, file-based)
- **Frontend** uses Next.js App Router with no external UI library — all components are handcrafted with Tailwind

---

## Monorepo Structure

The AI OS uses a monorepo layout (Turborepo):

```
D:\bot/
├── apps/
│   └── chat/                    # LibreChat fork (multi-provider chat shell)
│       ├── librechat.yaml       # Provider config (Ollama, OpenAI, Anthropic, Groq)
│       └── api/server/routes/agents/openhands.js  # OpenHands adapter route
├── packages/
│   ├── openhands-adapter/       # @localgpt/openhands-adapter — OpenHands REST client
│   ├── rag-pipeline/            # @localgpt/rag-pipeline — chunking, embedding, pgvector
│   ├── mastra-agents/           # @localgpt/mastra-agents — multi-agent orchestration
│   └── mcp-servers/             # @localgpt/mcp-servers — filesystem, KB, GitHub MCP
├── backend/                     # LocalGPT Studio FastAPI backend
├── frontend/                    # LocalGPT Studio Next.js frontend
├── BUILD.md                     # Full build guide for all phases
├── turbo.json
└── package.json
```

## Build

See [`BUILD.md`](./BUILD.md) for the full build guide covering all 7 phases:
1. **LibreChat** — fork, configure providers, run chat shell
2. **OpenHands** — Docker agent server, adapter route
3. **RAG Pipeline** — document ingestion, pgvector, hybrid search
4. **Mastra Agents** — orchestration, workflow engine
5. **MCP Connectors** — filesystem, KB, GitHub servers
6. **Auth & Billing** — Better Auth, Razorpay/Stripe
7. **Desktop** — Tauri wrapper (if needed)

---

## License

MIT
