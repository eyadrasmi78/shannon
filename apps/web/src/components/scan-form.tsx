'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Lock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type ScanPhase = 'idle' | 'submitting' | 'cloning' | 'starting' | 'redirecting';

const phaseMessages: Record<ScanPhase, string> = {
  idle: 'Start Scan',
  submitting: 'Submitting...',
  cloning: 'Cloning repository... this may take a minute',
  starting: 'Launching scan worker...',
  redirecting: 'Redirecting to scan...',
};

export function ScanForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const isLoading = phase !== 'idle';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setPhase('submitting');
    setError(null);

    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const repo = formData.get('repo') as string;
    const workspace = (formData.get('workspace') as string) || undefined;
    const gitToken = (formData.get('gitToken') as string) || undefined;

    // If it's a GitHub URL, show cloning state
    const isGitHub = repo.includes('github.com');
    if (isGitHub) setPhase('cloning');

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, repo, workspace, gitToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to start scan');
        setPhase('idle');
        return;
      }

      setPhase('redirecting');
      router.push(`/scan/${data.workspace}`);
    } catch {
      setError('Network error. Is the server running?');
      setPhase('idle');
    }
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Target URL"
          name="url"
          type="url"
          placeholder="https://example.com"
          required
          disabled={isLoading}
        />
        <Input
          label="Repository"
          name="repo"
          placeholder="https://github.com/user/repo or /local/path"
          required
          disabled={isLoading}
        />
        <p className="text-xs text-text-muted -mt-3">
          Accepts a GitHub URL (auto-cloned) or a local path on the server.
        </p>

        <Input
          label="Workspace Name (optional)"
          name="workspace"
          placeholder="my-audit"
          disabled={isLoading}
        />

        <div>
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            disabled={isLoading}
          >
            <Lock className="h-3 w-3" />
            {showToken ? 'Hide' : 'Private repo? Add GitHub token'}
          </button>
          {showToken && (
            <div className="mt-2">
              <Input
                label="GitHub Token (for private repos)"
                name="gitToken"
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                disabled={isLoading}
              />
              <p className="text-xs text-text-muted mt-1">
                Generate at github.com/settings/tokens with &quot;repo&quot; scope.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Play className="h-4 w-4" />
          }
          {phaseMessages[phase]}
        </Button>

        {isLoading && phase === 'cloning' && (
          <div className="space-y-2">
            <div className="h-1.5 w-full rounded-full bg-surface-overlay overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-xs text-text-muted">
              Cloning from GitHub and building Docker worker. This typically takes 1-3 minutes for the first scan.
            </p>
          </div>
        )}
      </form>
    </Card>
  );
}
