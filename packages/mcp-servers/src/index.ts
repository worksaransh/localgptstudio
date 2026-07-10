/**
 * Custom MCP Servers
 *
 * First-party MCP servers for the AI OS:
 * - Filesystem: read/write/search files within approved directories
 * - Knowledge Base: search the RAG vector store
 * - GitHub: read PRs, create issues, review diffs
 *
 * Each server follows the Model Context Protocol (MCP) using
 * Anthropic's MCP SDK conventions.
 */

// ─── MCP Tool Definition ──────────────────────────────────────────────────

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPRequest {
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface MCPServerConfig {
  authToken?: string;
  allowedDirectories?: string[];
  ragEndpoint?: string;
  githubToken?: string;
  rateLimit?: number; // requests per minute
}

// ─── Base Server ──────────────────────────────────────────────────────────

export abstract class MCPServer {
  protected config: MCPServerConfig;

  constructor(config: MCPServerConfig = {}) {
    this.config = config;
  }

  abstract getTools(): MCPTool[];
  abstract handleTool(name: string, args: Record<string, unknown>): Promise<MCPResponse>;

  health(): { status: string; toolCount: number } {
    return {
      status: "ok",
      toolCount: this.getTools().length,
    };
  }
}

// ─── Filesystem Server ────────────────────────────────────────────────────

export class FilesystemMCPServer extends MCPServer {
  private allowedDirs: string[];

  constructor(config: MCPServerConfig = {}) {
    super(config);
    this.allowedDirs = config.allowedDirectories ?? [process.cwd()];
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "read_file",
        description: "Read the contents of a file within an allowed directory",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute path to the file" },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file within an allowed directory",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute path to the file" },
            content: { type: "string", description: "Content to write" },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "list_directory",
        description: "List files and directories in a path",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute path to the directory" },
          },
          required: ["path"],
        },
      },
      {
        name: "search_files",
        description: "Recursively search for files matching a glob pattern",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Glob pattern (e.g. **/*.ts)" },
            root: { type: "string", description: "Root directory to search from" },
          },
          required: ["pattern"],
        },
      },
    ];
  }

  private validatePath(requestedPath: string): string {
    const resolved = require("path").resolve(requestedPath);
    const allowed = this.allowedDirs.some((dir) =>
      resolved.startsWith(require("path").resolve(dir))
    );
    if (!allowed) throw new Error(`Path not allowed: ${resolved}`);
    return resolved;
  }

  async handleTool(name: string, args: Record<string, unknown>): Promise<MCPResponse> {
    try {
      switch (name) {
        case "read_file": {
          const path = this.validatePath(args.path as string);
          const fs = await import("fs/promises");
          const content = await fs.readFile(path, "utf-8");
          return { content: [{ type: "text", text: content }] };
        }
        case "write_file": {
          const path = this.validatePath(args.path as string);
          const fs = await import("fs/promises");
          await fs.mkdir(require("path").dirname(path), { recursive: true });
          await fs.writeFile(path, args.content as string, "utf-8");
          return { content: [{ type: "text", text: `Written ${path}` }] };
        }
        case "list_directory": {
          const path = this.validatePath(args.path as string);
          const fs = await import("fs/promises");
          const entries = await fs.readdir(path, { withFileTypes: true });
          const listing = entries.map((e: any) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`).join("\n");
          return { content: [{ type: "text", text: listing }] };
        }
        case "search_files": {
          const { glob } = await import("glob");
          const root = (args.root as string) || process.cwd();
          const matches = await glob(args.pattern as string, { cwd: root });
          return { content: [{ type: "text", text: matches.join("\n") }] };
        }
        default:
          return { content: [], isError: true };
      }
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }
}

// ─── Knowledge Base Server ────────────────────────────────────────────────

export class KnowledgeBaseMCPServer extends MCPServer {
  constructor(config: MCPServerConfig = {}) {
    super(config);
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "search_knowledge_base",
        description: "Search the RAG vector store for documents matching a query",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            sourceApp: { type: "string", description: "Filter by source application" },
            workspaceId: { type: "string", description: "Filter by workspace" },
            limit: { type: "number", description: "Max results (default 10)" },
          },
          required: ["query"],
        },
      },
    ];
  }

  async handleTool(name: string, args: Record<string, unknown>): Promise<MCPResponse> {
    if (name !== "search_knowledge_base") {
      return { content: [], isError: true };
    }
    try {
      const ragEndpoint = this.config.ragEndpoint ?? "http://localhost:8000/api/rag/search";
      const res = await fetch(ragEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!res.ok) throw new Error(`RAG search failed: ${res.status}`);
      const data = await res.json();
      const formatted = (data.results ?? [])
        .map((r: any) => `[${r.fileName}] (${(r.score * 100).toFixed(0)}% match):\n${r.content.slice(0, 500)}`)
        .join("\n\n---\n\n");
      return { content: [{ type: "text", text: formatted || "No results found." }] };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Search error: ${err.message}` }], isError: true };
    }
  }
}

// ─── GitHub Server ────────────────────────────────────────────────────────

export class GitHubMCPServer extends MCPServer {
  private token: string;

  constructor(config: MCPServerConfig = {}) {
    super(config);
    this.token = config.githubToken ?? "";
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.v3+json",
    };
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "get_pr",
        description: "Get details of a GitHub pull request",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            pullNumber: { type: "number" },
          },
          required: ["owner", "repo", "pullNumber"],
        },
      },
      {
        name: "create_issue",
        description: "Create a GitHub issue",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
          },
          required: ["owner", "repo", "title"],
        },
      },
      {
        name: "get_pr_diff",
        description: "Get the diff of a pull request",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            pullNumber: { type: "number" },
          },
          required: ["owner", "repo", "pullNumber"],
        },
      },
    ];
  }

  async handleTool(name: string, args: Record<string, unknown>): Promise<MCPResponse> {
    try {
      const { owner, repo } = args as any;
      switch (name) {
        case "get_pr": {
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${args.pullNumber}`,
            { headers: this.headers }
          );
          if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
          const pr = await res.json();
          return {
            content: [{ type: "text", text: `# ${pr.title}\n${pr.body ?? "No description"}\n\nState: ${pr.state}\nFiles: ${pr.changed_files}\nAdditions: ${pr.additions}\nDeletions: ${pr.deletions}` }],
          };
        }
        case "create_issue": {
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/issues`,
            {
              method: "POST",
              headers: this.headers,
              body: JSON.stringify({ title: args.title, body: args.body }),
            }
          );
          if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
          const issue = await res.json();
          return { content: [{ type: "text", text: `Created issue: ${issue.html_url}` }] };
        }
        case "get_pr_diff": {
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${args.pullNumber}`,
            { headers: { ...this.headers, Accept: "application/vnd.github.v3.diff" } }
          );
          if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
          const diff = await res.text();
          return { content: [{ type: "text", text: diff.slice(0, 50000) }] };
        }
        default:
          return { content: [], isError: true };
      }
    } catch (err: any) {
      return { content: [{ type: "text", text: `GitHub error: ${err.message}` }], isError: true };
    }
  }
}

// ─── Server Registry ──────────────────────────────────────────────────────

export type MCPServerName = "filesystem" | "knowledge_base" | "github";

export class MCPServerRegistry {
  private servers: Map<string, MCPServer> = new Map();

  register(name: string, server: MCPServer): void {
    this.servers.set(name, server);
  }

  get(name: string): MCPServer | undefined {
    return this.servers.get(name);
  }

  getAll(): Array<{ name: string; tools: MCPTool[] }> {
    return Array.from(this.servers.entries()).map(([name, server]) => ({
      name,
      tools: server.getTools(),
    }));
  }

  async handleRequest(serverName: string, request: MCPRequest): Promise<MCPResponse> {
    const server = this.servers.get(serverName);
    if (!server) {
      return { content: [{ type: "text", text: `Unknown MCP server: ${serverName}` }], isError: true };
    }
    return server.handleTool(request.params.name, request.params.arguments);
  }
}
