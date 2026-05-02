import { readdir, realpath, stat as statAsync, unlink } from 'node:fs/promises';
import * as path from 'node:path';

/**
 * @description Options for {@link pruneKeyedRunOutputDirectory}.
 */
export interface PruneKeyedRunOutputDirectoryParams {
  readonly baseDirectory: string;
  /** @description Delete files whose mtime is older than `nowMs - maxAgeMs`. */
  readonly maxAgeMs?: number;
  /** @description After age pruning, delete oldest files by mtime until total bytes is at or below this cap. */
  readonly maxTotalBytes?: number;
  /** @description Clock for tests; defaults to `Date.now()`. */
  readonly nowMs?: number;
}

/**
 * @description Result of a best-effort retention pass (per-file errors do not throw).
 */
export interface PruneKeyedRunOutputDirectoryResult {
  readonly deletedFileCount: number;
  readonly freedBytes: number;
  readonly remainingTotalBytes: number;
  readonly skippedUnlinkErrors: number;
}

const isPathInsideDirectory = (candidate: string, dir: string): boolean => {
  const cand = path.resolve(candidate);
  const d = path.resolve(dir);
  if (cand === d) {
    return false;
  }
  const rel = path.relative(d, cand);

  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
};

const isRunOutputLeafName = (name: string): boolean => {
  const ext = path.extname(name);

  return ext === '.jsonl' || ext === '.log';
};

const parsePositiveInt = (value: number | undefined): number | undefined => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.floor(value);
};

/**
 * @description Recursively lists run transcript paths under `root` (only `.jsonl` / `.log` leaves).
 */
const collectRunOutputFiles = async (root: string): Promise<string[]> => {
  const resolvedRoot = path.resolve(root);
  const out: string[] = [];

  const walkDir = async (dir: string): Promise<void> => {
    let names: string[];

    try {
      names = await readdir(dir);
    } catch {
      return;
    }

    const statEntries = await Promise.all(
      names.map(async (name) => {
        const joined = path.normalize(path.join(dir, name));

        if (!isPathInsideDirectory(joined, resolvedRoot)) {
          return undefined;
        }

        try {
          const st = await statAsync(joined);

          return { joined, name, st };
        } catch {
          return undefined;
        }
      }),
    );

    const subdirs: string[] = [];

    for (const entry of statEntries) {
      if (entry === undefined) {
        continue;
      }

      if (entry.st.isDirectory()) {
        subdirs.push(entry.joined);
      } else if (entry.st.isFile() && isRunOutputLeafName(entry.name)) {
        out.push(entry.joined);
      }
    }

    await Promise.all(subdirs.map((sub) => walkDir(sub)));
  };

  await walkDir(resolvedRoot);

  return out;
};

interface FileStatRow {
  readonly absPath: string;
  readonly mtimeMs: number;
  readonly size: number;
}

/**
 * @description Best-effort retention for keyed BullMQ run output trees: optional max age, then optional total-byte cap (oldest mtime first). Only deletes `*.jsonl` and `*.log` files whose realpath stays under the resolved base directory.
 */
export const pruneKeyedRunOutputDirectory = async (
  params: PruneKeyedRunOutputDirectoryParams,
): Promise<PruneKeyedRunOutputDirectoryResult> => {
  const nowMs = params.nowMs ?? Date.now();
  const maxAgeMs = parsePositiveInt(params.maxAgeMs);
  const maxTotalBytes = parsePositiveInt(params.maxTotalBytes);

  if (maxAgeMs === undefined && maxTotalBytes === undefined) {
    return {
      deletedFileCount: 0,
      freedBytes: 0,
      remainingTotalBytes: 0,
      skippedUnlinkErrors: 0,
    };
  }

  let rootReal: string;

  try {
    rootReal = await realpath(path.resolve(params.baseDirectory));
  } catch {
    return {
      deletedFileCount: 0,
      freedBytes: 0,
      remainingTotalBytes: 0,
      skippedUnlinkErrors: 0,
    };
  }

  const paths = await collectRunOutputFiles(rootReal);
  const rowResults = await Promise.all(
    paths.map(async (absPath) => {
      try {
        const fr = await realpath(absPath);

        if (!isPathInsideDirectory(fr, rootReal)) {
          return undefined;
        }

        const st = await statAsync(fr);

        if (!st.isFile()) {
          return undefined;
        }

        const row: FileStatRow = {
          absPath: fr,
          mtimeMs: st.mtimeMs,
          size: st.size,
        };

        return row;
      } catch {
        return undefined;
      }
    }),
  );

  const rows = rowResults.filter((r): r is FileStatRow => r !== undefined);

  const toDelete = new Set<string>();
  let skippedUnlinkErrors = 0;

  if (maxAgeMs !== undefined) {
    const cutoff = nowMs - maxAgeMs;

    for (const row of rows) {
      if (row.mtimeMs < cutoff) {
        toDelete.add(row.absPath);
      }
    }
  }

  const remainingAfterAge = rows.filter((r) => !toDelete.has(r.absPath));

  if (maxTotalBytes !== undefined) {
    const sumSize = (list: FileStatRow[]): number =>
      list.reduce((acc, r) => acc + r.size, 0);

    let candidates = [...remainingAfterAge].sort(
      (a, b) => a.mtimeMs - b.mtimeMs,
    );
    let total = sumSize(candidates);

    while (total > maxTotalBytes && candidates.length > 0) {
      const victim = candidates[0];

      if (victim === undefined) {
        break;
      }

      toDelete.add(victim.absPath);
      candidates = candidates.slice(1);
      total = sumSize(candidates);
    }
  }

  const rowByAbsPath = new Map(rows.map((r) => [r.absPath, r]));
  const unlinkOutcomes = await Promise.all(
    [...toDelete].map(async (absPath) => {
      const row = rowByAbsPath.get(absPath);

      try {
        await unlink(absPath);

        return { absPath, ok: true as const, size: row?.size ?? 0 };
      } catch {
        return { absPath, ok: false as const };
      }
    }),
  );

  const successfullyDeleted = new Set<string>();
  let deletedFileCount = 0;
  let freedBytes = 0;

  for (const outcome of unlinkOutcomes) {
    if (outcome.ok) {
      successfullyDeleted.add(outcome.absPath);
      deletedFileCount += 1;
      freedBytes += outcome.size;
    } else {
      skippedUnlinkErrors += 1;
    }
  }

  const survivors = rows.filter((r) => !successfullyDeleted.has(r.absPath));
  const remainingTotalBytes = survivors.reduce((acc, r) => acc + r.size, 0);

  return {
    deletedFileCount,
    freedBytes,
    remainingTotalBytes,
    skippedUnlinkErrors,
  };
};
