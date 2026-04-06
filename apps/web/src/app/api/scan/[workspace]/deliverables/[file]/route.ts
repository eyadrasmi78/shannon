import { NextResponse } from 'next/server';
import { readDeliverable } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspace: string; file: string }> },
): Promise<NextResponse> {
  const { workspace, file } = await params;
  const content = await readDeliverable(workspace, file);
  if (content === null) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }
  return NextResponse.json({ filename: file, content });
}
