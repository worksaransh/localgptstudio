/**
 * OpenHands Agent Adapter
 *
 * Thin client that connects to the OpenHands Agent Server REST API.
 * Tasks are forwarded, progress is streamed back as SSE.
 */

export type TaskStatus = "running" | "completed" | "failed" | "awaiting_approval";

export interface TaskEvent {
  type: "message" | "file_edit" | "terminal_output" | "test_result" | "approval_request" | "error" | "done";
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  events: TaskEvent[];
  summary?: string;
}

export interface ApprovalRequest {
  taskId: string;
  prompt: string;
  diff?: string;
}

export interface OpenHandsConfig {
  baseUrl: string;
  apiKey?: string;
  defaultTimeoutMs?: number;
}

export class OpenHandsClient {
  private baseUrl: string;
  private apiKey?: string;
  private defaultTimeoutMs: number;

  constructor(config: OpenHandsConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 300_000;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }

  async submitTask(task: {
    description: string;
    repoPath?: string;
    workspaceId?: string;
    mode?: "autonomous" | "step_approval";
    maxIterations?: number;
  }): Promise<{ taskId: string }> {
    const res = await fetch(`${this.baseUrl}/api/tasks`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        task: task.description,
        repo_path: task.repoPath,
        workspace_id: task.workspaceId,
        mode: task.mode ?? "autonomous",
        max_iterations: task.maxIterations ?? 50,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      throw new Error(`OpenHands submit failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    return { taskId: data.task_id };
  }

  async *streamTaskEvents(taskId: string): AsyncGenerator<TaskEvent> {
    const res = await fetch(`${this.baseUrl}/api/tasks/${taskId}/events`, {
      headers: { ...this.headers, Accept: "text/event-stream" },
    });
    if (!res.ok) throw new Error(`Failed to stream events: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body for streaming");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            yield JSON.parse(line.slice(6)) as TaskEvent;
          } catch { /* skip malformed events */ }
        }
      }
    }
  }

  async getTaskResult(taskId: string): Promise<TaskResult> {
    const res = await fetch(`${this.baseUrl}/api/tasks/${taskId}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Failed to get task result: ${res.status}`);
    return res.json();
  }

  async approveStep(taskId: string, approved: boolean, feedback?: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/tasks/${taskId}/approve`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ approved, feedback }),
    });
  }

  async health(): Promise<{ status: string; version?: string }> {
    const res = await fetch(`${this.baseUrl}/api/health`, {
      headers: this.headers,
    });
    if (!res.ok) return { status: "unreachable" };
    return res.json();
  }
}

export function createOpenHandsClient(config: OpenHandsConfig): OpenHandsClient {
  return new OpenHandsClient(config);
}
