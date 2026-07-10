/**
 * RAG Pipeline
 *
 * Document ingestion → chunking → embedding → pgvector storage → hybrid search.
 * Designed to share a single Supabase Postgres instance across apps
 * (Mediverse OS, GrowthOS, AI OS) via the `source_app` column.
 */

// ─── Constants ────────────────────────────────────────────────────────────

export const DEFAULT_CHUNK_SIZE = 1200;
export const DEFAULT_CHUNK_OVERLAP = 200;
export const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small

// ─── Types ────────────────────────────────────────────────────────────────

export interface Chunk {
  index: number;
  text: string;
  tokenCount: number;
}

export interface DocumentRecord {
  id: string;
  sourceApp: string;
  workspaceId: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface ChunkRecord {
  id: string;
  documentId: string;
  sourceApp: string;
  workspaceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  fileName: string;
}

export interface SearchOptions {
  query: string;
  sourceApp?: string;
  workspaceId?: string;
  limit?: number;
  minScore?: number;
  useHybrid?: boolean;
}

// ─── Chunker ───────────────────────────────────────────────────────────────

export class TextChunker {
  private chunkSize: number;
  private overlap: number;

  constructor(chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_CHUNK_OVERLAP) {
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }

  chunk(text: string): Chunk[] {
    const chunks: Chunk[] = [];
    let index = 0;
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      const segment = text.slice(start, end);
      chunks.push({ index, text: segment, tokenCount: this.estimateTokens(segment) });
      index++;
      start = end - this.overlap;
      if (start >= text.length) break;
      if (start < 0) start = 0;
    }
    return chunks;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// ─── Embedder ──────────────────────────────────────────────────────────────

export interface EmbedderConfig {
  provider: "openai" | "anthropic" | "local";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  dimension?: number;
}

export class Embedder {
  private config: EmbedderConfig;

  constructor(config: EmbedderConfig) {
    this.config = config;
  }

  async embed(texts: string[]): Promise<number[][]> {
    switch (this.config.provider) {
      case "openai":
        return this.embedOpenAI(texts);
      case "local":
        return this.embedLocal(texts);
      default:
        return this.embedOpenAI(texts);
    }
  }

  private async embedOpenAI(texts: string[]): Promise<number[][]> {
    const baseUrl = this.config.baseUrl ?? "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.config.model,
      }),
    });
    if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
    const data = await res.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }

  private async embedLocal(texts: string[]): Promise<number[][]> {
    const baseUrl = this.config.baseUrl ?? "http://localhost:1234/v1";
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: texts, model: this.config.model }),
    });
    if (!res.ok) throw new Error(`Local embedding failed: ${res.status}`);
    const data = await res.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }
}

// ─── PgVector Store ────────────────────────────────────────────────────────

export interface PgVectorConfig {
  connectionString: string;
  tableName?: string;
}

export class PgVectorStore {
  private config: PgVectorConfig;
  private db: any = null;

  constructor(config: PgVectorConfig) {
    this.config = config;
    this.config.tableName = config.tableName ?? "document_chunks";
  }

  private async getDb() {
    if (!this.db) {
      const { default: pg } = await import("postgres");
      this.db = pg(this.config.connectionString);
    }
    return this.db;
  }

  async ensureSchema(): Promise<void> {
    const sql = await this.getDb();
    await sql.unsafe(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE TABLE IF NOT EXISTS ${sql(this.config.tableName!)} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL,
        source_app TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT '',
        chunk_index INT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(${EMBEDDING_DIMENSION}),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_source_app ON ${sql(this.config.tableName!)}(source_app);
      CREATE INDEX IF NOT EXISTS idx_chunks_workspace ON ${sql(this.config.tableName!)}(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON ${sql(this.config.tableName!)} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    `);
  }

  async insertChunks(chunks: ChunkRecord[]): Promise<void> {
    const sql = await this.getDb();
    for (const chunk of chunks) {
      await sql.unsafe(
        `INSERT INTO ${sql(this.config.tableName!)} (document_id, source_app, workspace_id, chunk_index, content, embedding) VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [chunk.documentId, chunk.sourceApp, chunk.workspaceId, chunk.chunkIndex, chunk.content, `[${chunk.embedding.join(",")}]`]
      );
    }
  }

  async hybridSearch(opts: SearchOptions): Promise<SearchResult[]> {
    const sql = await this.getDb();
    const limit = opts.limit ?? 10;
    const minScore = opts.minScore ?? 0.0;

    // Vector search
    const embedder = new Embedder({
      provider: "openai",
      model: "text-embedding-3-small",
    });
    const [queryVector] = await embedder.embed([opts.query]);

    const conditions = ["1=1"];
    const params: any[] = [];
    let paramIdx = 0;

    if (opts.sourceApp) {
      paramIdx++;
      conditions.push(`c.source_app = $${paramIdx}`);
      params.push(opts.sourceApp);
    }
    if (opts.workspaceId) {
      paramIdx++;
      conditions.push(`c.workspace_id = $${paramIdx}`);
      params.push(opts.workspaceId);
    }

    paramIdx++;
    conditions.push(`c.embedding IS NOT NULL`);
    const vectorParam = `[${queryVector.join(",")}]`;
    params.push(vectorParam);
    paramIdx++;

    const whereClause = conditions.join(" AND ");

    const rows = await sql.unsafe(
      `SELECT c.id, c.document_id, c.content, c.chunk_index,
              1 - (c.embedding <=> $${paramIdx}::vector) AS vector_score,
              ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $${paramIdx + 1})) AS text_score,
              d.file_name
       FROM ${sql(this.config.tableName!)} c
       JOIN documents d ON d.id = c.document_id
       WHERE ${whereClause}
       ORDER BY vector_score DESC
       LIMIT ${limit}`,
      [...params, opts.query]
    );

    return rows
      .filter((r: any) => r.vector_score >= minScore)
      .map((r: any) => ({
        chunkId: r.id,
        documentId: r.document_id,
        content: r.content,
        score: r.vector_score,
        fileName: r.file_name,
      }));
  }
}

// ─── Pipeline Orchestrator ─────────────────────────────────────────────────

export class RagPipeline {
  private chunker: TextChunker;
  private embedder: Embedder;
  private store: PgVectorStore;

  constructor(config: {
    chunker?: TextChunker;
    embedder: Embedder;
    store: PgVectorStore;
  }) {
    this.chunker = config.chunker ?? new TextChunker();
    this.embedder = config.embedder;
    this.store = config.store;
  }

  async ingestDocument(params: {
    documentId: string;
    sourceApp: string;
    workspaceId: string;
    content: string;
  }): Promise<number> {
    const chunks = this.chunker.chunk(params.content);
    const texts = chunks.map((c) => c.text);
    const embeddings = await this.embedder.embed(texts);

    const records: ChunkRecord[] = chunks.map((chunk, i) => ({
      id: "",
      documentId: params.documentId,
      sourceApp: params.sourceApp,
      workspaceId: params.workspaceId,
      chunkIndex: chunk.index,
      content: chunk.text,
      embedding: embeddings[i],
    }));

    await this.store.insertChunks(records);
    return records.length;
  }

  async search(opts: SearchOptions): Promise<SearchResult[]> {
    return this.store.hybridSearch(opts);
  }
}

export { postgres } from "./sql";
