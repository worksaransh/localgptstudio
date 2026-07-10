/**
 * Multi-Agent Orchestration via Mastra
 *
 * Defines agent roles as Mastra agents with workflow primitives
 * for plan → execute → review → approval → merge pipelines.
 * Long-running state delegates to Trigger.dev.
 */

// ─── Agent Role Definitions ───────────────────────────────────────────────

export type AgentRole =
  | "planner"
  | "coder"
  | "researcher"
  | "reviewer"
  | "human";

export interface AgentConfig {
  role: AgentRole;
  model: string;
  systemPrompt: string;
  tools: string[];
  temperature?: number;
  maxSteps?: number;
}

export const DEFAULT_AGENTS: Record<Exclude<AgentRole, "human">, AgentConfig> = {
  planner: {
    role: "planner",
    model: "claude-sonnet-4-5",
    systemPrompt: "You are a planning agent. Break down complex tasks into sequential steps, identify required tools and agents, and produce an executable plan.",
    tools: ["search_knowledge_base"],
    temperature: 0.3,
  },
  coder: {
    role: "coder",
    model: "claude-sonnet-4-5",
    systemPrompt: "You are a coding agent. You write, edit, and test code. Use the OpenHands bridge for autonomous execution.",
    tools: ["openhands_execute", "search_knowledge_base"],
    temperature: 0.2,
  },
  researcher: {
    role: "researcher",
    model: "claude-sonnet-4-5",
    systemPrompt: "You are a research agent. Gather information from the knowledge base and web to inform decisions.",
    tools: ["search_knowledge_base", "web_search"],
    temperature: 0.5,
  },
  reviewer: {
    role: "reviewer",
    model: "claude-opus-4-5",
    systemPrompt: "You are a review agent. Check code for correctness, security, and style. Flag issues before merge.",
    tools: ["search_knowledge_base"],
    temperature: 0.2,
  },
};

// ─── Workflow Primitives ──────────────────────────────────────────────────

export type WorkflowStep = {
  id: string;
  type: "plan" | "execute" | "research" | "review" | "human_approval" | "merge";
  agent: AgentRole;
  input: string;
  dependsOn: string[];
  status: "pending" | "running" | "completed" | "failed" | "blocked";
  output?: string;
  artifacts?: string[];
};

export interface Workflow {
  id: string;
  title: string;
  steps: WorkflowStep[];
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowEngineConfig {
  agents: AgentConfig[];
  durableExecutionUrl?: string; // Trigger.dev endpoint
}

// ─── Workflow Engine ──────────────────────────────────────────────────────

export class WorkflowEngine {
  private config: WorkflowEngineConfig;

  constructor(config: WorkflowEngineConfig) {
    this.config = config;
  }

  createWorkflow(title: string, task: string): Workflow {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      title,
      steps: [
        {
          id: crypto.randomUUID(),
          type: "plan",
          agent: "planner",
          input: task,
          dependsOn: [],
          status: "pending",
        },
      ],
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    return workflow;
  }

  expandPlan(workflow: Workflow, planSteps: Omit<WorkflowStep, "id" | "status">[]): Workflow {
    // Remove the initial planning step and replace with the generated plan
    const steps: WorkflowStep[] = planSteps.map((step) => ({
      ...step,
      id: crypto.randomUUID(),
      status: "pending",
    }));

    return {
      ...workflow,
      steps,
      status: "running",
      updatedAt: new Date().toISOString(),
    };
  }

  getNextReadySteps(workflow: Workflow): WorkflowStep[] {
    const completedIds = new Set(
      workflow.steps.filter((s) => s.status === "completed").map((s) => s.id)
    );
    return workflow.steps.filter(
      (step) =>
        step.status === "pending" &&
        step.dependsOn.every((depId) => completedIds.has(depId))
    );
  }

  updateStepStatus(
    workflow: Workflow,
    stepId: string,
    status: WorkflowStep["status"],
    output?: string
  ): Workflow {
    const steps = workflow.steps.map((step) =>
      step.id === stepId ? { ...step, status, output } : step
    );

    const allCompleted = steps.every((s) => s.status === "completed");
    const anyFailed = steps.some((s) => s.status === "failed");

    return {
      ...workflow,
      steps,
      status: anyFailed ? "failed" : allCompleted ? "completed" : "running",
      updatedAt: new Date().toISOString(),
    };
  }

  toWorkflowSummary(workflow: Workflow): string {
    const stepSummary = workflow.steps
      .map((s) => `  [${s.status}] ${s.type} (${s.agent}): ${s.input.slice(0, 60)}`)
      .join("\n");
    return `Workflow: ${workflow.title} [${workflow.status}]\n${stepSummary}`;
  }
}

// ─── Tool Definitions ─────────────────────────────────────────────────────

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export function createTool(tool: Tool): Tool {
  return tool;
}

export function createAgentExecutor(config: {
  role: AgentRole;
  tools: Tool[];
}) {
  return {
    role: config.role,
    tools: config.tools,
    execute: async (input: string, context?: Record<string, unknown>) => {
      return { role: config.role, result: `[${config.role}] processed: ${input.slice(0, 80)}`, context };
    },
  };
}
