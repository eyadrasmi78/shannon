import { NextResponse } from 'next/server';
import { resumeScan } from '@/lib/shannon-cli';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workspace: string }> },
): Promise<NextResponse> {
  const { workspace } = await params;
  const result = await resumeScan(workspace);
  if (!result) {
    return NextResponse.json({ error: 'Could not resume scan' }, { status: 400 });
  }
  return NextResponse.json({ success: true, workspace: result });
}
