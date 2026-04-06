'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function ScanForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const repo = formData.get('repo') as string;
    const workspace = (formData.get('workspace') as string) || undefined;

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, repo, workspace }),
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
          label="Repository Path"
          name="repo"
          placeholder="/path/to/repo or repo-name"
          required
        />
        <Input
          label="Workspace Name (optional)"
          name="workspace"
          placeholder="my-audit"
        />
        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}
        <Button type="submit" disabled={loading}>
          <Play className="h-4 w-4" />
          {loading ? 'Starting...' : 'Start Scan'}
        </Button>
      </form>
    </Card>
  );
}
