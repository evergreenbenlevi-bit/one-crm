// Agent Command Center types

export type AgentType = "team" | "agent" | "bot" | "skill" | "cron" | "advisor";
export type AgentChannel = "claude-code" | "telegram" | "cron" | "internal";
export type AgentModel = "opus" | "sonnet" | "haiku";
export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";
export type EdgeRelation = "dispatches" | "uses_skill" | "triggers_cron" | "monitors" | "feeds";

export interface AgentRecord {
  id: string;
  slug: string;
  name: string;
  type: AgentType;
  model: string | null;
  channel: string | null;
  parent_slug: string | null;
  description: string | null;
  file_path: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentHealthEvent {
  id: string;
  agent_slug: string;
  status: HealthStatus;
  response_ms: number | null;
  message: string | null;
  checked_at: string;
}

export interface AgentCostLog {
  id: string;
  agent_slug: string;
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cost_usd: number;
  session_count: number;
  metadata: Record<string, unknown>;
}

export interface AgentEdge {
  id: string;
  source_slug: string;
  target_slug: string;
  relation: EdgeRelation;
}

export interface AgentChatSession {
  id: string;
  agent_slug: string;
  messages: Array<{ role: string; content: string; timestamp?: string }>;
  created_at: string;
  updated_at: string;
}

// Topology data for React Flow
export interface TopologyNode {
  id: string;
  type: AgentType;
  label: string;
  model?: string;
  channel?: string;
  status: HealthStatus;
  costToday?: number;
}

export interface TopologyEdge {
  source: string;
  target: string;
  relation: EdgeRelation;
  volume?: number;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// Cron info (parsed from plist)
export interface CronInfo {
  label: string;
  script_path: string;
  schedule: string;
  is_loaded: boolean;
  stdout_path?: string;
  stderr_path?: string;
  working_directory?: string;
}

// Agent runs (execution traces)
export type RunStatus = "running" | "success" | "error";

export interface AgentRun {
  id: string;
  agent_slug: string;
  trace_id: string;
  parent_trace_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: RunStatus;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface AgentToolCall {
  id: string;
  run_id: string;
  tool_name: string;
  success: boolean;
  duration_ms: number | null;
  called_at: string;
}

// Agent with latest health (joined query)
export interface AgentWithHealth extends AgentRecord {
  latest_status?: HealthStatus;
  latest_check?: string;
  cost_today?: number;
}
