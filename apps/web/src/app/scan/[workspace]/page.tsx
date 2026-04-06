'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Square, RotateCcw, FileText, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PipelineViz } from '@/components/pipeline-viz';
import { MetricsPanel } from '@/components/metrics-panel';
import { LogViewer } from '@/components/log-viewer';
import type { SessionData } from '@/lib/constants';

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'in-progress') return 'warning';
  return 'danger';
}

export default function ScanDetailPage() {
  const params = useParams<{ workspace: string }>();
  const workspace = params.workspace;
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll(): Promise<void> {
      try {
        const res = await fetch(`/api/scan/${workspace}/status`);
        if (!res.ok) {
          if (res.status === 404) setError('Workspace not found. It may still be initializing...');
          return;
        }
        const data = await res.json();
        if (active) {
          setSession(data);
          setError(null);
        }
      } catch {
        // Network error, will retry
      }
    }

    poll();
    const interval = setInterval(poll, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [workspace]);

  async function handleStop(): Promise<void> {
    await fetch(`/api/scan/${workspace}/stop`, { method: 'POST' });
  }

  async function handleResume(): Promise<void> {
    await fetch(`/api/scan/${workspace}/resume`, { method: 'POST' });
  }

  const status = session?.session.status ?? 'in-progress';
  const isRunning = status === 'in-progress';
  const isFailed = status === 'failed';
  const isComplete = status === 'completed';

  const completedAgents = session
    ? Object.values(session.metrics.agents).filter((a) => a.status === 'success').length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{workspace}</h1>
            <Badge variant={statusVariant(status)}>{status}</Badge>
          </div>
          {session && (
            <p className="text-sm text-text-muted">{session.session.webUrl}</p>
          )}
          {error && !session && (
            <p className="text-sm text-warning">{error}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Button variant="danger" onClick={handleStop}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
          {isFailed && (
            <Button variant="secondary" onClick={handleResume}>
              <RotateCcw className="h-4 w-4" />
              Resume
            </Button>
          )}
          {isComplete && (
            <>
              <Link href={`/scan/${workspace}/report`}>
                <Button variant="primary">
                  <FileText className="h-4 w-4" />
                  View Report
                </Button>
              </Link>
              <Link href={`/scan/${workspace}/deliverables`}>
                <Button variant="secondary">
                  <FolderOpen className="h-4 w-4" />
                  Deliverables
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Pipeline Visualization */}
      {session && <PipelineViz agentMetrics={session.metrics.agents} />}

      {/* Metrics */}
      <MetricsPanel
        durationMs={session?.metrics.total_duration_ms ?? 0}
        costUsd={session?.metrics.total_cost_usd ?? 0}
        completedAgents={completedAgents}
      />

      {/* Live Logs */}
      <LogViewer workspace={workspace} />
    </div>
  );
}
