'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Square, RotateCcw, FileText, FolderOpen, Loader2, Server, GitBranch, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PipelineViz } from '@/components/pipeline-viz';
import { MetricsPanel } from '@/components/metrics-panel';
import { LogViewer } from '@/components/log-viewer';
import type { SessionData } from '@/lib/constants';

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'in-progress') return 'warning';
  return 'danger';
}

// === Initialization Indicator ===

function InitializingView({ workspace, secondsWaiting }: { workspace: string; secondsWaiting: number }) {
  // Determine which step we're likely on based on elapsed time
  const steps = [
    { label: 'Cloning repository', icon: GitBranch, doneAfter: 30 },
    { label: 'Building Docker worker', icon: Server, doneAfter: 90 },
    { label: 'Starting Temporal workflow', icon: Shield, doneAfter: 120 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{workspace}</h1>
        <Badge variant="warning">initializing</Badge>
      </div>

      <Card className="max-w-lg">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-accent">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium">Setting up scan environment...</span>
          </div>

          <div className="space-y-3 ml-2">
            {steps.map((step) => {
              const isDone = secondsWaiting > step.doneAfter;
              const isActive = !isDone && secondsWaiting <= step.doneAfter;
              const Icon = step.icon;

              return (
                <div key={step.label} className="flex items-center gap-3">
                  {isDone && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
                      <div className="h-2 w-2 rounded-full bg-success" />
                    </div>
                  )}
                  {isActive && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
                  {!isDone && !isActive && (
                    <div className="flex h-5 w-5 items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-border-default" />
                    </div>
                  )}
                  <Icon className={`h-4 w-4 ${isDone ? 'text-success' : isActive ? 'text-accent' : 'text-text-muted'}`} />
                  <span className={`text-sm ${isDone ? 'text-text-secondary' : isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-text-muted mt-4">
            First scan takes 2-3 minutes to build the worker image. Subsequent scans start faster.
          </p>

          {secondsWaiting > 180 && (
            <p className="text-xs text-warning">
              This is taking longer than usual. Check if Docker is running on the server.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

// === Main Page ===

export default function ScanDetailPage() {
  const params = useParams<{ workspace: string }>();
  const workspace = params.workspace;
  const [session, setSession] = useState<SessionData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [secondsWaiting, setSecondsWaiting] = useState(0);

  // Poll for session data
  useEffect(() => {
    let active = true;

    async function poll(): Promise<void> {
      try {
        const res = await fetch(`/api/scan/${workspace}/status`);
        if (!res.ok) {
          if (res.status === 404 && active) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (active) {
          setSession(data);
          setNotFound(false);
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

  // Count seconds while waiting for initialization
  useEffect(() => {
    if (session) return; // Stop counting once session appears

    const interval = setInterval(() => {
      setSecondsWaiting((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Show initialization view when workspace doesn't exist yet
  if (!session && notFound) {
    return <InitializingView workspace={workspace} secondsWaiting={secondsWaiting} />;
  }

  // Show loading spinner before first poll completes
  if (!session && !notFound) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const status = session?.session.status ?? 'in-progress';
  const isRunning = status === 'in-progress';
  const isFailed = status === 'failed';
  const isComplete = status === 'completed';

  const completedAgents = session
    ? Object.values(session.metrics.agents).filter((a) => a.status === 'success').length
    : 0;

  async function handleStop(): Promise<void> {
    await fetch(`/api/scan/${workspace}/stop`, { method: 'POST' });
  }

  async function handleResume(): Promise<void> {
    await fetch(`/api/scan/${workspace}/resume`, { method: 'POST' });
  }

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
            <Link href={`/scan/${workspace}/report`}>
              <Button variant="primary">
                <FileText className="h-4 w-4" />
                View Report
              </Button>
            </Link>
          )}
          {completedAgents > 0 && (
            <Link href={`/scan/${workspace}/deliverables`}>
              <Button variant="secondary">
                <FolderOpen className="h-4 w-4" />
                Deliverables ({completedAgents})
              </Button>
            </Link>
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
