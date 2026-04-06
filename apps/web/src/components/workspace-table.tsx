import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { WorkspaceSummary } from '@/lib/constants';

function formatDuration(ms: number): string {
  if (ms <= 0) return '--';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatCost(usd: number): string {
  if (usd <= 0) return '--';
  return `$${usd.toFixed(2)}`;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'in-progress') return 'warning';
  return 'danger';
}

export function WorkspaceTable({ workspaces }: { workspaces: WorkspaceSummary[] }) {
  if (workspaces.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-raised p-12 text-center">
        <p className="text-text-secondary">No scans yet.</p>
        <Link href="/scan/new" className="mt-2 inline-block text-accent hover:text-accent-hover">
          Start your first scan
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-default">
      <table className="w-full text-sm">
        <thead className="bg-surface-raised text-text-secondary">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Workspace</th>
            <th className="px-4 py-3 text-left font-medium">Target URL</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Duration</th>
            <th className="px-4 py-3 text-left font-medium">Cost</th>
            <th className="px-4 py-3 text-left font-medium">Agents</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {workspaces.map((ws) => (
            <tr key={ws.name} className="hover:bg-surface-overlay/50 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/scan/${ws.name}`} className="text-accent hover:text-accent-hover font-medium">
                  {ws.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-secondary max-w-[300px] truncate">{ws.url}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(ws.status)}>{ws.status}</Badge>
              </td>
              <td className="px-4 py-3 text-text-secondary">{formatDuration(ws.durationMs)}</td>
              <td className="px-4 py-3 text-text-secondary">{formatCost(ws.costUsd)}</td>
              <td className="px-4 py-3 text-text-secondary">{ws.agentCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
