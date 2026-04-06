import { COMPLETION_PATTERN } from '@/lib/constants';
import { readLogTail } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspace: string }> },
): Promise<Response> {
  const { workspace } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let offset = 0;
      let closed = false;

      function send(data: string): void {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: data })}\n\n`));
      }

      function sendDone(): void {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        cleanup();
      }

      async function poll(): Promise<void> {
        if (closed) return;
        const result = await readLogTail(workspace, offset);
        if (!result) return;

        if (result.data) {
          offset = result.offset;
          send(result.data);

          if (COMPLETION_PATTERN.test(result.data)) {
            sendDone();
          }
        }
      }

      const interval = setInterval(poll, 1000);

      // Initial read
      poll();

      // 30-minute max connection
      const timeout = setTimeout(() => sendDone(), 30 * 60 * 1000);

      function cleanup(): void {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearTimeout(timeout);
        try { controller.close(); } catch { /* already closed */ }
      }

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
