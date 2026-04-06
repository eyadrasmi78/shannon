import path from 'node:path';

export const WORKSPACES_DIR = process.env.WORKSPACES_DIR ?? path.resolve(process.cwd(), '..', '..', 'workspaces');
export const SHANNON_CLI_PATH = process.env.SHANNON_CLI_PATH ?? path.resolve(process.cwd(), '..', '..', 'shannon');

/** Prevents path traversal by ensuring resolved path stays within base */
export function safePath(base: string, ...segments: string[]): string | null {
  const resolved = path.resolve(base, ...segments);
  const normalizedBase = path.resolve(base);
  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    return null;
  }
  return resolved;
}
