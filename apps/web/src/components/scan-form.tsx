'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function ScanForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const repo = formData.get('repo') as string;
    const workspace = (formData.get('workspace') as string) || undefined;
    const gitToken = (formData.get('gitToken') as string) || undefined;

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, repo, workspace, gitToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to start scan');
        setLoading(false);
        return;
      }

      router.push(`/scan/${data.workspace}`);
    } catch {
      setError('Network error. Is the server running?');
      setLoading(false);
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
        />
        <Input
          label="Repository"
          name="repo"
          placeholder="https://github.com/user/repo or /local/path"
          required
        />
        <p className="text-xs text-text-muted -mt-3">
          Accepts a GitHub URL (auto-cloned) or a local path on the server.
        </p>

        <Input
          label="Workspace Name (optional)"
          name="workspace"
          placeholder="my-audit"
        />

        <div>
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
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
        <Button type="submit" disabled={loading}>
          <Play className="h-4 w-4" />
          {loading ? 'Cloning repo & starting scan...' : 'Start Scan'}
        </Button>
      </form>
    </Card>
  );
}
