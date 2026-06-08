import { join } from 'node:path';

import type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from '../config/workspace-config.js';
import { resolveWorkspaceConfig } from '../config/workspace-config.js';
import { hashFile } from '../utils/hash.js';
import { runRipgrep, workspaceRipgrepArgs } from '../utils/ripgrep.js';

/** A single file's path and content fingerprint, used for incremental sync. */
export interface WorkspaceFileHash {
  /** sha256 hex fingerprint of the file's contents. */
  hash: string;
  /** Workspace-relative POSIX path. */
  path: string;
}

/**
 * Enumerate every tracked file in the workspace, returning workspace-relative
 * paths. Backed by `rg --files`, so `.gitignore` rules and the config's
 * exclude globs are honored — the same scoping an IDE applies to a project.
 *
 * @publicApi
 */
export async function listFiles(config: WorkspaceConfig): Promise<string[]> {
  const resolved = resolveWorkspaceConfig(config);
  const { stdout } = await runRipgrep(
    [...workspaceRipgrepArgs(resolved), '--files'],
    resolved,
  );

  return splitLines(stdout);
}

/**
 * Enumerate the workspace and compute a content fingerprint for each file.
 * The result is the snapshot you diff against a previous scan to find which
 * files changed and need re-processing.
 *
 * @publicApi
 */
export async function hashWorkspace(
  config: WorkspaceConfig,
): Promise<WorkspaceFileHash[]> {
  const resolved = resolveWorkspaceConfig(config);
  const paths = await listFilesResolved(resolved);

  return Promise.all(
    paths.map(async (path) => ({
      hash: await hashFile(join(resolved.root, path)),
      path,
    })),
  );
}

async function listFilesResolved(
  resolved: ResolvedWorkspaceConfig,
): Promise<string[]> {
  const { stdout } = await runRipgrep(
    [...workspaceRipgrepArgs(resolved), '--files'],
    resolved,
  );

  return splitLines(stdout);
}

function splitLines(stdout: string): string[] {
  return stdout.split('\n').filter((line) => line.length > 0);
}
