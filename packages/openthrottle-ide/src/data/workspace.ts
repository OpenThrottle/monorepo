import { join } from 'node:path';

import type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from '../config/workspace-config.js';
import {
  filterRealPathsInsideRoot,
  resolveWorkspaceConfig,
} from '../config/workspace-config.js';
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
 * The set of changes between two {@link hashWorkspace} snapshots. This is the
 * Merkle-lite delta downstream layers (symbols, semantic) consume to re-process
 * only what changed instead of the whole tree.
 *
 * @publicApi
 */
export interface SnapshotDiff {
  /** Paths present in `next` but not in `prev`. */
  added: string[];
  /** Paths present in both, with a different content hash. */
  changed: string[];
  /** Paths present in `prev` but not in `next`. */
  removed: string[];
}

/**
 * Diff two workspace snapshots by path and content hash. Pure and
 * deterministic — it touches no filesystem and the returned path lists are
 * sorted, so equal inputs always produce equal output.
 *
 * @publicApi
 */
export function diffSnapshots(
  prev: WorkspaceFileHash[],
  next: WorkspaceFileHash[],
): SnapshotDiff {
  const prevByPath = new Map(prev.map((entry) => [entry.path, entry.hash]));
  const nextByPath = new Map(next.map((entry) => [entry.path, entry.hash]));

  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];

  for (const [path, hash] of nextByPath) {
    const prevHash = prevByPath.get(path);
    if (prevHash === undefined) {
      added.push(path);
    } else if (prevHash !== hash) {
      changed.push(path);
    }
  }

  for (const path of prevByPath.keys()) {
    if (!nextByPath.has(path)) {
      removed.push(path);
    }
  }

  return {
    added: added.sort(),
    changed: changed.sort(),
    removed: removed.sort(),
  };
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

  return listFilesResolved(resolved);
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

  const paths = splitLines(stdout);

  // `rg --follow` can enumerate a symlinked path whose real target lives
  // outside `root`. ripgrep only restricts the path it *prints*, not where it
  // resolves to, so before any downstream layer hashes or reads these paths we
  // drop the ones whose canonical location escapes the workspace.
  if (!resolved.followSymlinks) {
    return paths;
  }

  return filterRealPathsInsideRoot(resolved, paths);
}

function splitLines(stdout: string): string[] {
  return stdout.split('\n').filter((line) => line.length > 0);
}
