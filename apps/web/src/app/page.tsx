import { WorkspaceTable } from '@/components/workspace-table';
import { listWorkspaces } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const workspaces = await listWorkspaces();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scans</h1>
        <span className="text-sm text-text-muted">{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</span>
      </div>
      <WorkspaceTable workspaces={workspaces} />
    </div>
  );
}
