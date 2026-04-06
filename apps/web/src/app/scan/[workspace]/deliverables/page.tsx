import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Search, Crosshair, AlertTriangle } from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { listDeliverables, readDeliverable, type DeliverableFile } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const categoryConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  report: { icon: Shield, label: 'Final Report', color: 'text-accent' },
  recon: { icon: Search, label: 'Reconnaissance', color: 'text-blue-400' },
  vulnerability: { icon: AlertTriangle, label: 'Vulnerability Analysis', color: 'text-warning' },
  exploitation: { icon: Crosshair, label: 'Exploitation Evidence', color: 'text-danger' },
  other: { icon: FileText, label: 'Other', color: 'text-text-muted' },
};

function DeliverableGroup({ category, files }: {
  category: string;
  files: (DeliverableFile & { content: string })[];
}) {
  const config = categoryConfig[category] ?? categoryConfig.other!;
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.color}`} />
        <h2 className={`text-sm font-semibold ${config.color}`}>{config.label}</h2>
        <span className="text-xs text-text-muted">({files.length})</span>
      </div>
      <div className="space-y-2">
        {files.map((d) => (
          <details key={d.name} className="group rounded-lg border border-border-default bg-surface-raised"
            {...(category === 'report' ? { open: true } : {})}
          >
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-overlay/50 transition-colors">
              <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
              <span className="font-medium text-sm">{d.displayName}</span>
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
          <p className="text-text-secondary">No deliverables yet. The scan may still be running.</p>
          <Link href={`/scan/${workspace}`} className="mt-2 inline-block text-accent hover:text-accent-hover text-sm">
            Check scan progress
          </Link>
        </div>
      </div>
    );
  }

  // Read all file contents
  const deliverables = await Promise.all(
    files.map(async (f) => {
      const content = await readDeliverable(workspace, f.name);
      return { ...f, content: content ?? '' };
    }),
  );

  // Group by category
  const grouped = new Map<string, (DeliverableFile & { content: string })[]>();
  for (const d of deliverables) {
    const existing = grouped.get(d.category) ?? [];
    existing.push(d);
    grouped.set(d.category, existing);
  }

  // Order: report, recon, vulnerability, exploitation, other
  const categoryOrder = ['report', 'recon', 'vulnerability', 'exploitation', 'other'];
  const orderedGroups = categoryOrder
    .filter((c) => grouped.has(c))
    .map((c) => ({ category: c, files: grouped.get(c)! }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/scan/${workspace}`} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to scan
        </Link>
        <span className="text-sm text-text-muted">{files.length} deliverable{files.length !== 1 ? 's' : ''}</span>
      </div>

      <h1 className="text-xl font-bold">Deliverables</h1>

      <div className="space-y-8">
        {orderedGroups.map((g) => (
          <DeliverableGroup key={g.category} category={g.category} files={g.files} />
        ))}
      </div>
    </div>
  );
}
