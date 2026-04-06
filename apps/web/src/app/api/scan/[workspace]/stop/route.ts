import { NextResponse } from 'next/server';
import { stopScan } from '@/lib/shannon-cli';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workspace: string }> },
): Promise<NextResponse> {
  const { workspace } = await params;
  const success = stopScan(workspace);
  return NextResponse.json({ success });
}
