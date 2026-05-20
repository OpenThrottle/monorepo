/**
 * @description Diff logic for doc ingestion: expand dirs + files to markdown paths, compute content hashes, compare with prior state to produce to-add, to-update, to-remove.
 * See docs/openthrottle/doc-ingestion-job-spec.md.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { getPriorState } from './doc-ingestion-state';

/** Payload for the doc-ingestion BullMQ job. At least one of directories or files must be set. */
interface DocIngestionJobPayload {
  readonly directories?: readonly string[];
  readonly files?: readonly string[];
  readonly scope?: string;
  readonly repo?: string;
  readonly sha?: string;
}

/** Result of diffing current filesystem state vs prior ingestion state. */
interface DocIngestionDiff {
  readonly toAdd: readonly string[];
  readonly toUpdate: readonly string[];
  readonly toRemove: readonly string[];
  /** Content hash per path for paths in toAdd or toUpdate; used to persist prior state after ingest. */
  readonly currentHashes: ReadonlyMap<string, string>;
}

/**
 * @description Normalizes a path to be relative to workspace root with forward slashes and no leading ./.
 */
function normalizeRelativePath(
  workspaceRoot: string,
  absolutePath: string,
): string {
  const rel = relative(workspaceRoot, absolutePath);
  return rel.split(sep).join('/').replace(/^\.\//, '');
}

/**
 * @description Recursively collects relative paths of .md files under dir (relative to workspace root).
 */
async function collectMdPathsUnderDir(
  workspaceRoot: string,
  dirRelative: string,
): Promise<string[]> {
  const out: string[] = [];
  const absoluteDir = join(workspaceRoot, dirRelative);

  let entries: { name: string; isFile: () => boolean }[];
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const e of entries) {
    const rel = dirRelative ? `${dirRelative}/${e.name}` : e.name;

    if (e.isFile() && e.name.endsWith('.md')) {
      out.push(normalizeRelativePath(workspaceRoot, join(workspaceRoot, rel)));
    } else if (e.isFile() === false) {
      out.push(
        // eslint-disable-next-line no-await-in-loop
        ...(await collectMdPathsUnderDir(workspaceRoot, rel)),
      );
    }
  }

  return out;
}

/**
 * @description Expands job payload (directories + files) to a deduplicated list of markdown paths relative to workspace root.
 * Directories are recursively scanned for .md files; files are included only if they exist and end in .md.
 */
async function expandToMarkdownPaths(
  workspaceRoot: string,
  payload: Pick<DocIngestionJobPayload, 'directories' | 'files'>,
): Promise<string[]> {
  const dirs = payload.directories ?? [];
  const files = payload.files ?? [];

  if (dirs.length === 0 && files.length === 0) {
    return [];
  }

  const pathSet = new Set<string>();

  for (const dir of dirs) {
    const normalizedDir = dir.replace(/^\.\//, '').replace(/\/$/, '');
    // eslint-disable-next-line no-await-in-loop
    const paths = await collectMdPathsUnderDir(workspaceRoot, normalizedDir);
    for (const p of paths) {
      pathSet.add(p);
    }
  }

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const normalized = file.replace(/^\.\//, '');
    const absolutePath = join(workspaceRoot, normalized);
    try {
      // eslint-disable-next-line no-await-in-loop
      await access(absolutePath);
      pathSet.add(normalized);
    } catch {
      // File does not exist or not readable; skip
    }
  }

  return [...pathSet].sort();
}

/**
 * @description Computes SHA-256 hex hash of file content. Returns undefined if file cannot be read.
 */
async function computeContentHash(
  absolutePath: string,
): Promise<string | undefined> {
  try {
    const content = await readFile(absolutePath, 'utf-8');
    return createHash('sha256').update(content, 'utf8').digest('hex');
  } catch {
    return undefined;
  }
}

interface ComputeDocIngestionDiffOptions {
  readonly connectionString: string;
  readonly payload: DocIngestionJobPayload;
  readonly scope: string;
  readonly workspaceRoot: string;
}

/**
 * @description Computes diff between current filesystem state and prior ingestion state.
 * Returns toAdd (new paths), toUpdate (changed content), toRemove (paths no longer on disk or in scope).
 * When prior state is empty for the scope, all expanded paths are toAdd.
 */
export async function computeDocIngestionDiff(
  options: ComputeDocIngestionDiffOptions,
): Promise<DocIngestionDiff> {
  const { connectionString, payload, scope, workspaceRoot } = options;

  const [expandedPaths, priorState] = await Promise.all([
    expandToMarkdownPaths(workspaceRoot, payload),
    getPriorState(connectionString, scope),
  ]);

  const currentHashes = new Map<string, string>();
  for (const relPath of expandedPaths) {
    const absolutePath = join(workspaceRoot, relPath);

    // eslint-disable-next-line no-await-in-loop
    const hash = await computeContentHash(absolutePath);
    if (hash !== undefined) {
      currentHashes.set(relPath, hash);
    }
  }

  const currentPaths = new Set(currentHashes.keys());
  const toAdd: string[] = [];
  const toUpdate: string[] = [];
  const toRemove: string[] = [];

  for (const path of currentPaths) {
    const prior = priorState.get(path);
    const currentHash = currentHashes.get(path);
    if (currentHash === undefined) continue;

    if (prior === undefined) {
      toAdd.push(path);
    } else if (prior.contentHash !== currentHash) {
      toUpdate.push(path);
    }
  }

  for (const path of priorState.keys()) {
    if (!currentPaths.has(path)) {
      toRemove.push(path);
    }
  }

  return {
    currentHashes,
    toAdd: toAdd.sort(),
    toRemove: toRemove.sort(),
    toUpdate: toUpdate.sort(),
  };
}
