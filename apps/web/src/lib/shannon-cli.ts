import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isValidWorkspaceName } from './constants';
import { SHANNON_CLI_PATH, REPOS_DIR } from './paths';
import { getWorkspace } from './workspaces';

interface StartScanOptions {
  url: string;
  repo: string;
  workspace?: string;
  configPath?: string;
  gitToken?: string;
}

const GITHUB_URL_PATTERN = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/;

/**
 * If repo is a GitHub URL, clone it locally and return the local path.
 * If repo is already a local path, return as-is.
 */
function resolveRepo(repo: string, gitToken?: string): string {
  if (!GITHUB_URL_PATTERN.test(repo)) {
    return repo;
  }

  // Extract org/name from GitHub URL
  const match = repo.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
  if (!match) return repo;

  const repoName = match[2]!.replace(/\.git$/, '');
  const localPath = path.join(REPOS_DIR, repoName);

  // If already cloned, pull latest
  if (fs.existsSync(path.join(localPath, '.git'))) {
    try {
      execSync('git pull', { cwd: localPath, timeout: 60_000, stdio: 'ignore' });
    } catch {
      // Pull failed, use existing checkout
    }
    return localPath;
  }

  // Clone the repo
  fs.mkdirSync(REPOS_DIR, { recursive: true });

  let cloneUrl = repo.replace(/\/$/, '');
  if (!cloneUrl.endsWith('.git')) {
    cloneUrl += '.git';
  }

  // Inject token for private repos: https://TOKEN@github.com/...
  if (gitToken) {
    cloneUrl = cloneUrl.replace('https://github.com', `https://${gitToken}@github.com`);
  }

  try {
    execSync(`git clone ${cloneUrl} ${localPath}`, {
      timeout: 300_000,
      stdio: 'pipe',
    });
  } catch (err) {
    const stderr = err instanceof Error && 'stderr' in err ? String((err as { stderr: unknown }).stderr) : '';
    if (stderr.includes('could not read Username') || stderr.includes('Authentication failed')) {
      throw new Error(
        'Repository clone failed — this appears to be a private repo. ' +
        'Please provide a GitHub token using the "Private repo?" option in the scan form.',
      );
    }
    throw new Error(`Repository clone failed: ${stderr || 'unknown error'}`);
  }

  return localPath;
}

/** Start a Shannon scan as a detached process. Returns the workspace name. */
export function startScan(opts: StartScanOptions): string {
  const workspace = opts.workspace ?? `scan-${Date.now()}`;

  if (!isValidWorkspaceName(workspace)) {
    throw new Error('Invalid workspace name. Use only letters, numbers, hyphens, and underscores.');
  }

  // Resolve GitHub URLs to local paths (auto-clone)
  const localRepo = resolveRepo(opts.repo, opts.gitToken);

  const args = ['start', '-u', opts.url, '-r', localRepo, '-w', workspace];
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
