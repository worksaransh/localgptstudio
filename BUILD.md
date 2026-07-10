# Build Guide — AI Operating System

## Prerequisites

| Tool | Version | Required For |
|------|---------|-------------|
| Node.js | >= 18 | LibreChat, all packages |
| npm | >= 10 | Package management |
| MongoDB | >= 7 | LibreChat conversation store |
| Docker | Latest | OpenHands Agent Server |
| Ollama | Latest | Local model inference |
| Python | >= 3.11 | RAG pipeline, OpenHands tools |

---

## Phase 1 — LibreChat (Chat Shell)

```bash
# 1. Start MongoDB
mongod --dbpath ./data/mongodb

# 2. Install LibreChat deps
cd apps/chat
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env: set MongoDB URI, API keys, JWT secrets

# 4. Build & run
npm run build
npm run backend    # http://localhost:3080
```

**Verify:** Open http://localhost:3080, login, send a message to any configured provider.

---

## Phase 2 — OpenHands (Coding Agent Backend)

```bash
# Start the OpenHands Agent Server (Docker)
docker run -it --rm -p 8000:8000 \
  -v $HOME/.openhands:/home/openhands/.openhands \
  -v $(pwd)/projects:/projects \
  ghcr.io/openhands/agent-canvas:latest

# The adapter route inside LibreChat proxies to this service
# Configured via env: OPENHANDS_URL=http://localhost:8000
```

**Verify:** `curl http://localhost:8000/api/health` returns `{"status":"ok"}`

---

## Phase 3 — RAG Pipeline

```bash
# 1. Enable pgvector on your Supabase instance
# Run: CREATE EXTENSION vector;

# 2. Install the RAG package
cd packages/rag-pipeline
npm install

# 3. Run schema migration
# The PgVectorStore.ensureSchema() creates tables + indexes
# Connection string from Supabase dashboard

# 4. Ingest documents
# Upload → chunk → embed → store pipeline
# See packages/rag-pipeline/src/index.ts for usage
```

---

## Phase 4 — Multi-Agent Orchestration

```bash
cd packages/mastra-agents
npm install

# Agents are defined in src/index.ts:
# - PlannerAgent: breaks tasks into steps
# - CodeAgent: wraps OpenHands
# - ResearchAgent: wraps RAG search
# - ReviewAgent: code review

# Workflow engine: WorkflowEngine class
# Long-running state: Trigger.dev
```

---

## Phase 5 — MCP Connectors

MCP servers are defined in `packages/mcp-servers/`.

| Server | Tools | Auth |
|--------|-------|------|
| Filesystem | read/write/list/search files | Directory allowlist |
| Knowledge Base | vector search | RAG endpoint |
| GitHub | get PR, create issue, get diff | GitHub token |

Custom MCP servers are registered in LibreChat's `librechat.yaml` under `mcpServers`.

---

## Running Everything

```bash
# Terminal 1: MongoDB
mongod --dbpath ./data/mongodb

# Terminal 2: LibreChat
cd apps/chat && npm run backend

# Terminal 3: (optional) OpenHands
docker run -it --rm -p 8000:8000 ghcr.io/openhands/agent-canvas:latest

# Terminal 4: (optional) Ollama
ollama serve
```

---

## Project Structure

```
ai-operating-system/
├── apps/
│   └── chat/                    # LibreChat fork (chat shell)
│       ├── api/                 # Express backend
│       │   └── server/routes/agents/openhands.js  # OpenHands adapter
│       ├── client/              # React SPA
│       ├── librechat.yaml       # Provider config
│       └── .env                 # Environment
├── packages/
│   ├── openhands-adapter/       # @localgpt/openhands-adapter
│   │   └── src/index.ts         # OpenHands REST client + SSE streaming
│   ├── rag-pipeline/            # @localgpt/rag-pipeline
│   │   └── src/index.ts         # Chunker, Embedder, PgVectorStore, hybrid search
│   ├── mastra-agents/           # @localgpt/mastra-agents
│   │   └── src/index.ts         # Agent roles, workflow engine, tool defs
│   └── mcp-servers/             # @localgpt/mcp-servers
│       └── src/index.ts         # Filesystem, KB, GitHub MCP servers
├── backend/                     # LocalGPT Studio FastAPI backend
├── frontend/                    # LocalGPT Studio Next.js frontend
├── BUILD.md                     # This file
├── turbo.json                   # Turborepo pipeline
└── package.json                 # Monorepo root
```
