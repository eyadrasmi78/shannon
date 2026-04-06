import { NextResponse } from 'next/server';
import { startScan } from '@/lib/shannon-cli';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { url, repo, workspace, configPath } = body as {
      url?: string;
      repo?: string;
      workspace?: string;
      configPath?: string;
    };

    if (!url || !repo) {
      return NextResponse.json({ error: 'url and repo are required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const opts = { url, repo, ...(workspace ? { workspace } : {}), ...(configPath ? { configPath } : {}) };
    const workspaceName = startScan(opts);
    return NextResponse.json({ workspace: workspaceName });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start scan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
