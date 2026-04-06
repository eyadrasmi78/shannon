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

/** List deliverable files in a workspace. */
export async function listDeliverables(name: string): Promise<{ name: string; size: number }[]> {
  const dirPath = safePath(WORKSPACES_DIR, name, 'deliverables');
  if (!dirPath) return [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: { name: string; size: number }[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const stat = await fs.stat(path.join(dirPath, entry.name));
      files.push({ name: entry.name, size: stat.size });
    }

    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Read a specific deliverable file. Returns null if not found or path traversal detected. */
export async function readDeliverable(workspace: string, filename: string): Promise<string | null> {
  const filePath = safePath(WORKSPACES_DIR, workspace, 'deliverables', filename);
  if (!filePath) return null;

  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
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
