import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { readDeliverable, listDeliverables } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;

  // Try the standard report filename, then fall back to any *report*.md
  let content = await readDeliverable(workspace, 'comprehensive_security_assessment_report.md');

  if (!content) {
    const files = await listDeliverables(workspace);
    const reportFile = files.find((f) => f.name.toLowerCase().includes('report'));
    if (reportFile) {
      content = await readDeliverable(workspace, reportFile.name);
    }
  }

  if (!content) {
    return (
      <div className="space-y-4">
        <Link href={`/scan/${workspace}`} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to scan
        </Link>
        <div className="rounded-lg border border-border-default bg-surface-raised p-12 text-center">
          <p className="text-text-secondary">Report not available yet. The scan may still be running.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/scan/${workspace}`} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to scan
        </Link>
        <span className="text-sm text-text-muted">{workspace}</span>
      </div>
      <div className="rounded-lg border border-border-default bg-surface-raised p-8">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}
