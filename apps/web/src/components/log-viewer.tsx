'use client';

import { useEffect, useRef, useState } from 'react';

export function LogViewer({ workspace }: { workspace: string }) {
  const [logs, setLogs] = useState('');
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLPreElement>(null);
  const stickyRef = useRef(true);

  useEffect(() => {
    const eventSource = new EventSource(`/api/scan/${workspace}/logs`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.done) {
          setDone(true);
          eventSource.close();
          return;
        }
        if (data.log) {
          setLogs((prev) => prev + data.log);
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [workspace]);

  // Auto-scroll to bottom (sticky scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (el && stickyRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  function handleScroll(): void {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 50;
    stickyRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default bg-surface-raised px-4 py-2">
        <span className="text-xs text-text-muted font-medium">workflow.log</span>
        {!done && (
          <span className="flex items-center gap-1.5 text-xs text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Live
          </span>
        )}
        {done && <span className="text-xs text-text-muted">Complete</span>}
      </div>
      <pre
        ref={containerRef}
        onScroll={handleScroll}
        className="h-80 overflow-auto p-4 text-xs leading-relaxed text-text-secondary whitespace-pre-wrap"
      >
        {logs || <span className="text-text-muted">Waiting for logs...</span>}
      </pre>
    </div>
  );
}
