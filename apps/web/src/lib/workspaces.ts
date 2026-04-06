import fs from 'node:fs/promises';
import path from 'node:path';
import type { SessionData, WorkspaceSummary } from './constants';
import { WORKSPACES_DIR, safePath } from './paths';

/** List all workspaces, sorted by creation date (newest first). */
export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  try {
    const entries = await fs.readdir(WORKSPACES_DIR, { withFileTypes: true });
    const workspaces: WorkspaceSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const session = await getWorkspace(entry.name);
      if (!session) continue;

      const completedAgents = Object.values(session.metrics.agents).filter((a) => a.status === 'success').length;

      workspaces.push({
        name: entry.name,
        url: session.session.webUrl,
        status: session.session.status,
        createdAt: session.session.createdAt,
        ...(session.session.completedAt ? { completedAt: session.session.completedAt } : {}),
        durationMs: session.metrics.total_duration_ms,
        costUsd: session.metrics.total_cost_usd,
        agentCount: completedAgents,
      });
    }

    workspaces.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return workspaces;
  } catch {
    return [];
  }
}

/** Read a single workspace's session.json. Returns null if not found. */
export async function getWorkspace(name: string): Promise<SessionData | null> {
  const sessionPath = safePath(WORKSPACES_DIR, name, 'session.json');
  if (!sessionPath) return null;

  try {
    const raw = await fs.readFile(sessionPath, 'utf-8');
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Find the deliverables directory for a workspace.
 * Checks workspace dir first, then falls back to the repo's .shannon/deliverables/.
 */
async function resolveDeliverablesDir(name: string): Promise<string | null> {
  // 1. Primary: workspaces/<name>/deliverables/
  const workspaceDir = safePath(WORKSPACES_DIR, name, 'deliverables');
  if (workspaceDir) {
    try {
      const entries = await fs.readdir(workspaceDir);
      if (entries.length > 0) return workspaceDir;
    } catch { /* fall through */ }
  }

  // 2. Fallback: check if session.json has repoPath, look in <repo>/.shannon/deliverables/
  const session = await getWorkspace(name);
  if (session?.session.repoPath) {
    const repoDeliverables = path.join(session.session.repoPath, '.shannon', 'deliverables');
    try {
      const entries = await fs.readdir(repoDeliverables);
      if (entries.length > 0) return repoDeliverables;
    } catch { /* fall through */ }
  }

  // 3. Return workspace dir even if empty (it will be populated as scan runs)
  return workspaceDir;
}

/** Deliverable file with metadata for display. */
export interface DeliverableFile {
  name: string;
  size: number;
  category: 'recon' | 'vulnerability' | 'exploitation' | 'report' | 'other';
  displayName: string;
}

/** Categorize a deliverable filename for grouped display. */
function categorizeDeliverable(filename: string): { category: DeliverableFile['category']; displayName: string } {
  const lower = filename.toLowerCase();

  if (lower.includes('report')) {
    return { category: 'report', displayName: 'Security Assessment Report' };
  }
  if (lower.includes('code_analysis')) {
    return { category: 'recon', displayName: 'Code Analysis' };
  }
  if (lower.includes('recon')) {
    return { category: 'recon', displayName: 'Reconnaissance' };
  }
  if (lower.includes('exploitation') || lower.includes('exploit')) {
    const type = extractVulnType(lower);
    return { category: 'exploitation', displayName: `${type} Exploitation Evidence` };
  }
  if (lower.includes('analysis') || lower.includes('vuln')) {
    const type = extractVulnType(lower);
    return { category: 'vulnerability', displayName: `${type} Vulnerability Analysis` };
  }
  return { category: 'other', displayName: filename.replace(/\.md$/, '').replace(/_/g, ' ') };
}

function extractVulnType(filename: string): string {
  if (filename.includes('injection')) return 'Injection';
  if (filename.includes('xss')) return 'XSS';
  if (filename.includes('auth') && filename.includes('authz')) return 'Authorization';
  if (filename.includes('authz')) return 'Authorization';
  if (filename.includes('auth')) return 'Authentication';
  if (filename.includes('ssrf')) return 'SSRF';
  return 'Security';
}

/** List deliverable files in a workspace with categories. */
export async function listDeliverables(name: string): Promise<DeliverableFile[]> {
  const dirPath = await resolveDeliverablesDir(name);
  if (!dirPath) return [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: DeliverableFile[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const stat = await fs.stat(path.join(dirPath, entry.name));
      const { category, displayName } = categorizeDeliverable(entry.name);
      files.push({ name: entry.name, size: stat.size, category, displayName });
    }

    // Sort: report first, then recon, vuln, exploitation, other
    const order: Record<string, number> = { report: 0, recon: 1, vulnerability: 2, exploitation: 3, other: 4 };
    return files.sort((a, b) => (order[a.category] ?? 5) - (order[b.category] ?? 5));
  } catch {
    return [];
  }
}

/** Read a specific deliverable file. Checks both workspace and repo locations. */
export async function readDeliverable(workspace: string, filename: string): Promise<string | null> {
  // Try workspace deliverables first
  const workspacePath = safePath(WORKSPACES_DIR, workspace, 'deliverables', filename);
  if (workspacePath) {
    try {
      return await fs.readFile(workspacePath, 'utf-8');
    } catch { /* fall through */ }
  }

  // Fallback: repo .shannon/deliverables/
  const session = await getWorkspace(workspace);
  if (session?.session.repoPath) {
    const repoPath = path.join(session.session.repoPath, '.shannon', 'deliverables', filename);
    try {
      return await fs.readFile(repoPath, 'utf-8');
    } catch { /* fall through */ }
  }

  return null;
}

/** Read workflow.log from a byte offset. Returns new content and updated offset. */
export async function readLogTail(
  name: string,
  startOffset: number,
): Promise<{ data: string; offset: number } | null> {
  const logPath = safePath(WORKSPACES_DIR, name, 'workflow.log');
  if (!logPath) return null;

  try {
    const stat = await fs.stat(logPath);
    if (stat.size <= startOffset) return { data: '', offset: startOffset };

    const handle = await fs.open(logPath, 'r');
    try {
      const buffer = Buffer.alloc(stat.size - startOffset);
      await handle.read(buffer, 0, buffer.length, startOffset);
      return { data: buffer.toString('utf-8'), offset: stat.size };
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}
