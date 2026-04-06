import { clsx } from 'clsx';
import { Check, Loader2, Circle } from 'lucide-react';
import { PHASES, type AgentAuditMetrics } from '@/lib/constants';

type PhaseState = 'completed' | 'active' | 'pending';

function getPhaseState(phaseAgents: readonly string[], agentMetrics: Record<string, AgentAuditMetrics>): PhaseState {
  const statuses = phaseAgents.map((a) => agentMetrics[a]?.status);
  if (statuses.some((s) => s === 'in-progress')) return 'active';
  if (statuses.every((s) => s === 'success')) return 'completed';
  return 'pending';
}

function getCurrentAgent(phaseAgents: readonly string[], agentMetrics: Record<string, AgentAuditMetrics>): string | null {
  for (const agent of phaseAgents) {
    if (agentMetrics[agent]?.status === 'in-progress') return agent;
  }
  return null;
}

export function PipelineViz({ agentMetrics }: { agentMetrics: Record<string, AgentAuditMetrics> }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      {PHASES.map((phase, i) => {
        const state = getPhaseState(phase.agents, agentMetrics);
        const currentAgent = state === 'active' ? getCurrentAgent(phase.agents, agentMetrics) : null;

        return (
          <div key={phase.id} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-border-default flex-shrink-0" />}
            <div
              className={clsx(
                'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm flex-shrink-0',
                state === 'completed' && 'border-success/30 bg-success/10 text-success',
                state === 'active' && 'border-accent/50 bg-accent/10 text-accent',
                state === 'pending' && 'border-border-default bg-surface-raised text-text-muted',
              )}
            >
              {state === 'completed' && <Check className="h-4 w-4" />}
              {state === 'active' && <Loader2 className="h-4 w-4 animate-spin" />}
              {state === 'pending' && <Circle className="h-4 w-4" />}
              <div>
                <div className="font-medium">{phase.label}</div>
                {currentAgent && (
                  <div className="text-xs opacity-75 mt-0.5">{currentAgent}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
