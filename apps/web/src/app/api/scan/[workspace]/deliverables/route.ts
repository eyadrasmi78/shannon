import { NextResponse } from 'next/server';
import { listDeliverables } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspace: string }> },
): Promise<NextResponse> {
  const { workspace } = await params;
  const files = await listDeliverables(workspace);
  return NextResponse.json(files);
}
