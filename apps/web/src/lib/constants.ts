// === Pipeline Phases ===

export type PhaseName = 'pre-recon' | 'recon' | 'vulnerability-analysis' | 'exploitation' | 'reporting';

export const PHASES: readonly { id: PhaseName; label: string; agents: readonly string[] }[] = [
  { id: 'pre-recon', label: 'Pre-Recon', agents: ['pre-recon'] },
  { id: 'recon', label: 'Recon', agents: ['recon'] },
  {
    id: 'vulnerability-analysis',
    label: 'Vuln Analysis',
    agents: ['injection-vuln', 'xss-vuln', 'auth-vuln', 'ssrf-vuln', 'authz-vuln'],
  },
  {
    id: 'exploitation',
    label: 'Exploitation',
    agents: ['injection-exploit', 'xss-exploit', 'auth-exploit', 'ssrf-exploit', 'authz-exploit'],
  },
  { id: 'reporting', label: 'Reporting', agents: ['report'] },
] as const;

export const TOTAL_AGENTS = PHASES.reduce((sum, p) => sum + p.agents.length, 0);

// === Session Types (mirrors apps/worker/src/audit/metrics-tracker.ts:55-72) ===

export interface AttemptData {
  attempt_number: number;
  duration_ms: number;
  cost_usd: number;
  success: boolean;
  timestamp: string;
  model?: string;
  error?: string;
}

export interface AgentAuditMetrics {
  status: 'in-progress' | 'success' | 'failed';
  attempts: AttemptData[];
  final_duration_ms: number;
  total_cost_usd: number;
  model?: string;
  checkpoint?: string;
}

export interface PhaseMetrics {
  duration_ms: number;
  duration_percentage: number;
  cost_usd: number;
  agent_count: number;
}

export interface SessionData {
  session: {
    id: string;
    webUrl: string;
    repoPath?: string;
    status: 'in-progress' | 'completed' | 'failed';
    createdAt: string;
    completedAt?: string;
    originalWorkflowId?: string;
    resumeAttempts?: {
      workflowId: string;
      timestamp: string;
      terminatedPrevious?: string;
      resumedFromCheckpoint?: string;
    }[];
  };
  metrics: {
    total_duration_ms: number;
    total_cost_usd: number;
    phases: Record<string, PhaseMetrics>;
    agents: Record<string, AgentAuditMetrics>;
  };
}

// === Workspace Summary (for dashboard list) ===

export interface WorkspaceSummary {
  name: string;
  url: string;
  status: 'in-progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  durationMs: number;
  costUsd: number;
  agentCount: number;
}

// === Completion Detection (mirrors apps/cli/src/commands/logs.ts:14) ===

export const COMPLETION_PATTERN = /^Workflow (COMPLETED|FAILED)$/m;

// === Validation ===

const WORKSPACE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function isValidWorkspaceName(name: string): boolean {
  return WORKSPACE_NAME_REGEX.test(name) && name.length > 0 && name.length <= 128;
}
