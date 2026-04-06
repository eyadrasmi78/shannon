import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { listDeliverables, readDeliverable } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default async function DeliverablesPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const files = await listDeliverables(workspace);

  if (files.length === 0) {
    return (
      <div className="space-y-4">
        <Link href={`/scan/${workspace}`} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to scan
        </Link>
        <div className="rounded-lg border border-border-default bg-surface-raised p-12 text-center">
          <p className="text-text-secondary">No deliverables yet.</p>
        </div>
      </div>
    );
  }

  // Read all deliverable contents for inline display
  const deliverables = await Promise.all(
    files.map(async (f) => {
      const content = await readDeliverable(workspace, f.name);
      return { ...f, content: content ?? '' };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/scan/${workspace}`} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to scan
        </Link>
        <span className="text-sm text-text-muted">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-4">
        {deliverables.map((d) => (
          <details key={d.name} className="group rounded-lg border border-border-default bg-surface-raised">
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-overlay/50 transition-colors">
              <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
              <span className="font-medium text-sm">{d.name}</span>
              <span className="text-xs text-text-muted ml-auto">{formatSize(d.size)}</span>
            </summary>
            <div className="border-t border-border-default p-6">
              <MarkdownRenderer content={d.content} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
