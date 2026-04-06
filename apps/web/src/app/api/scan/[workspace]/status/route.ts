import { NextResponse } from 'next/server';
import { getWorkspace } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspace: string }> },
): Promise<NextResponse> {
  const { workspace } = await params;
  const session = await getWorkspace(workspace);
  if (!session) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}
