import { Clock, DollarSign, Bot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { TOTAL_AGENTS } from '@/lib/constants';

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

interface MetricsPanelProps {
  durationMs: number;
  costUsd: number;
  completedAgents: number;
}

export function MetricsPanel({ durationMs, costUsd, completedAgents }: MetricsPanelProps) {
  const metrics = [
    { icon: Clock, label: 'Elapsed', value: formatDuration(durationMs) },
    { icon: DollarSign, label: 'Cost', value: costUsd > 0 ? `$${costUsd.toFixed(2)}` : '--' },
    { icon: Bot, label: 'Agents', value: `${completedAgents} / ${TOTAL_AGENTS}` },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {metrics.map((m) => (
        <Card key={m.label} className="flex items-center gap-3 p-4">
          <m.icon className="h-5 w-5 text-text-muted flex-shrink-0" />
          <div>
            <div className="text-xs text-text-muted">{m.label}</div>
            <div className="text-lg font-semibold">{m.value}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
