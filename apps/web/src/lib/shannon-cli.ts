import { spawn, execSync } from 'node:child_process';
import { isValidWorkspaceName } from './constants';
import { SHANNON_CLI_PATH } from './paths';
import { getWorkspace } from './workspaces';

interface StartScanOptions {
  url: string;
  repo: string;
  workspace?: string;
  configPath?: string;
}

/** Start a Shannon scan as a detached process. Returns the workspace name. */
export function startScan(opts: StartScanOptions): string {
  const workspace = opts.workspace ?? `scan-${Date.now()}`;

  if (!isValidWorkspaceName(workspace)) {
    throw new Error('Invalid workspace name. Use only letters, numbers, hyphens, and underscores.');
  }

  const args = ['start', '-u', opts.url, '-r', opts.repo, '-w', workspace];
  if (opts.configPath) {
    args.push('-c', opts.configPath);
  }

  const child = spawn(SHANNON_CLI_PATH, args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, SHANNON_LOCAL: '1' },
  });
  child.unref();

  return workspace;
}

/** Stop a specific scan by finding and stopping its Docker container. */
export function stopScan(workspace: string): boolean {
  if (!isValidWorkspaceName(workspace)) return false;

  try {
    // Find worker containers and match by workspace name in the command
    const output = execSync(
      'docker ps --filter "name=shannon-worker-" --format "{{.ID}} {{.Command}}"',
      { encoding: 'utf-8', timeout: 10_000 },
    );

    for (const line of output.trim().split('\n')) {
      if (!line) continue;
      if (line.includes(workspace)) {
        const containerId = line.split(' ')[0];
        if (containerId) {
          execSync(`docker stop ${containerId}`, { timeout: 30_000 });
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Resume a failed/stopped scan by re-running start with the same workspace. */
export async function resumeScan(workspace: string): Promise<string | null> {
  if (!isValidWorkspaceName(workspace)) return null;

  const session = await getWorkspace(workspace);
  if (!session) return null;

  const repoPath = session.session.repoPath;
  if (!repoPath) return null;

  return startScan({
    url: session.session.webUrl,
    repo: repoPath,
    workspace,
  });
}
