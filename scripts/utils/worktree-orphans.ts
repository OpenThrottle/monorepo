/**
 * @description Pure helpers for `pnpm worktree:serve --orphans`: find processes still running from
 * a worktree that is no longer registered with git.
 *
 * Why: servers launched by `worktree:serve` are detached on purpose (they must outlive the agent
 * shell that started them), so nothing stops them when their worktree goes away. Two ran for
 * 9 and 13 days after their worktrees were pruned, writing 166 MB and 245 MB of server.log. The
 * pidfiles that would name them live inside the worktree, which may be gone, so the process table
 * is the only reliable source: a process whose working directory sits under this repo's worktree
 * directory but inside no registered worktree is an orphan.
 *
 * Erasable-syntax TypeScript with no runtime imports, so bare Node can run it.
 */

import type { ProcessRow } from './worktree-serve.ts';

export interface OrphanProcess {
  readonly command: string;
  readonly cwd: string;
  readonly pgid: number;
  readonly pid: number;
}

export interface OrphanWorktree {
  /** The worktree directory the processes run from (it may no longer exist). */
  readonly path: string;
  /** The process groups to signal to stop everything, leaders first. */
  readonly pgids: readonly number[];
  readonly processes: readonly OrphanProcess[];
}

export interface FindOrphansParams {
  /** The repo's worktree directory, `<root>/<org>/<repo>` (skills/ot-worktree/scripts/root.sh). */
  readonly baseDir: string;
  /** pid → working directory, from {@link parseLsofCwds}. */
  readonly cwds: ReadonlyMap<number, string>;
  /** Absolute paths `git worktree list` reports for the repo. */
  readonly registered: ReadonlySet<string>;
  /** The process table, for each pid's process group and command line. */
  readonly table: readonly ProcessRow[];
}

/**
 * `lsof -d cwd -Fpn` output as pid → working directory. Each process is a `p<pid>` line followed
 * by its fields; only the `n<path>` field is read.
 */
export const parseLsofCwds = (output: string): Map<number, string> => {
  const cwds = new Map<number, string>();
  let pid: number | undefined;

  for (const line of output.split('\n')) {
    if (line.startsWith('p')) {
      const parsed = Number(line.slice(1));
      pid = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
    } else if (line.startsWith('n') && pid !== undefined) {
      cwds.set(pid, line.slice(1));
    }
  }

  return cwds;
};

/** `<baseDir>/<name>` for a cwd at or below a worktree in `baseDir`; undefined otherwise. */
export const worktreeOfCwd = (
  cwd: string,
  baseDir: string,
): string | undefined => {
  const prefix = `${baseDir.replace(/\/+$/, '')}/`;

  if (!cwd.startsWith(prefix)) {
    return undefined;
  }

  const [name] = cwd.slice(prefix.length).split('/');

  return name === undefined || name === '' ? undefined : `${prefix}${name}`;
};

/** `git worktree list --porcelain` output as the set of worktree paths it lists. */
export const parseWorktreeList = (output: string): Set<string> => {
  const paths = new Set<string>();

  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      paths.add(line.slice('worktree '.length).trim());
    }
  }

  return paths;
};

/**
 * Every unregistered worktree that still has processes running from it, sorted by path. `selfPid`
 * (this report's own process) is never listed.
 */
export const findOrphanWorktrees = (
  params: FindOrphansParams,
  selfPid: number,
): OrphanWorktree[] => {
  const { baseDir, cwds, registered, table } = params;
  const rows = new Map(table.map((row) => [row.pid, row]));
  const byWorktree = new Map<string, OrphanProcess[]>();

  for (const [pid, cwd] of cwds) {
    const path = worktreeOfCwd(cwd, baseDir);
    const row = rows.get(pid);

    if (
      path === undefined ||
      registered.has(path) ||
      row === undefined ||
      pid === selfPid
    ) {
      continue;
    }

    const found = byWorktree.get(path) ?? [];
    found.push({ command: row.command, cwd, pgid: row.pgid, pid });
    byWorktree.set(path, found);
  }

  return [...byWorktree.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, processes]) => {
      const sorted = [...processes].sort((a, b) => a.pid - b.pid);
      const leaders = sorted.filter((entry) => entry.pid === entry.pgid);
      const pgids = [
        ...new Set([
          ...leaders.map((entry) => entry.pgid),
          ...sorted.map((entry) => entry.pgid),
        ]),
      ];

      return { path, pgids, processes: sorted };
    });
};

/** A byte count as `245.0 MB`, `12.3 kB` or `512 B`. */
export const formatBytes = (bytes: number): string => {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }

  if (bytes >= 1000) {
    return `${(bytes / 1000).toFixed(1)} kB`;
  }

  return `${bytes} B`;
};
