/**
 * @description Nx's record of running continuous tasks, and what to do when it
 * is stale.
 *
 * Every continuous task (`dev`, a package's `dev`, a `codegen-*-watch`) is
 * recorded by the nx process that runs it in the `running_tasks` table of the
 * workspace's own SQLite database, `<root>/.nx/workspace-data/*-v3.db`:
 * `(task_id, pid, command, cwd)`, where `pid` is that nx process and `cwd` its
 * working directory (the checkout root). A later nx process asked to run a
 * task id that has a live row does not start it: it prints
 * `Waiting for <task id> in another nx process` and polls until the row is
 * gone. The owner removes its rows on a clean exit or SIGINT/SIGTERM. A dead
 * owner needs no clearing: Nx purges a row whose pid is gone or recycled (the
 * command no longer matches). The lock is only ever stale when the OWNER IS
 * STILL ALIVE but nobody is serving through it: an nx whose `pnpm` launcher was
 * killed (nx puts itself and its children in their own process groups, so
 * killing the launcher's group never reaches them) and whose server then died
 * or wedged. Its rows stay, every later `dev` waits on it, and nothing binds.
 *
 * The database is per checkout and the row carries the cwd, so selecting rows
 * by `cwd = <this worktree>` can never reach the primary checkout's nx.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { run } from './exec.ts';

export interface RunningTaskRow {
  readonly cwd: string;
  readonly pid: number;
  readonly taskId: string;
}

/** Worktree-relative directory holding the Nx workspace database. */
export const NX_DATA_DIR = '.nx/workspace-data';

const field = (value: object, key: string): unknown =>
  Object.entries(value).find(([name]) => name === key)?.[1];

/** Parse `sqlite3 -json` output of `select task_id, pid, cwd from running_tasks`. */
export const parseRunningTaskRows = (output: string): RunningTaskRow[] => {
  if (output.trim() === '') {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(output);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const rows: RunningTaskRow[] = [];

  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const taskId = field(entry, 'task_id');
    const pid = field(entry, 'pid');
    const cwd = field(entry, 'cwd');

    if (
      typeof taskId === 'string' &&
      typeof pid === 'number' &&
      typeof cwd === 'string'
    ) {
      // prettier-ignore
      rows.push({ cwd, pid, taskId });
    }
  }

  return rows;
};

/** The workspace database files under `root` (normally exactly one). */
export const nxDatabaseFiles = (root: string): string[] => {
  const directory = join(root, NX_DATA_DIR);

  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((name) => name.endsWith('-v3.db'))
    .map((name) => join(directory, name));
};

/** All `running_tasks` rows under `root`; empty when there is no database or no sqlite3. */
export const readRunningTasks = (root: string): RunningTaskRow[] =>
  nxDatabaseFiles(root).flatMap((database) =>
    parseRunningTaskRows(
      run('sqlite3', ['-json', database, 'select task_id, pid, cwd from running_tasks'], { allowFailure: true }).stdout, // prettier-ignore
    ),
  );

/** Delete `root`'s rows owned by the given (now dead) pids; best effort. */
export const deleteRunningTaskRows = (
  root: string,
  pids: readonly number[],
): void => {
  const list = pids.filter((pid) => Number.isInteger(pid) && pid > 0).join(',');

  if (list === '') {
    return;
  }

  const cwd = root.replaceAll("'", "''");

  for (const database of nxDatabaseFiles(root)) {
    run('sqlite3', [database, `delete from running_tasks where pid in (${list}) and cwd = '${cwd}'`], { allowFailure: true }); // prettier-ignore
  }
};

/**
 * The nx processes that hold one of `taskIds` in this checkout but are not
 * accounted for: alive, with their cwd at `root`, and not in `tracked` (the
 * pids the helper itself launched, with their descendants). These are the
 * orphans behind a stale `Waiting for ... in another nx process` lock.
 */
export const orphanedNxOwners = (
  rows: readonly RunningTaskRow[],
  root: string,
  taskIds: readonly string[],
  tracked: ReadonlySet<number>,
  isAlive: (pid: number) => boolean,
): number[] => {
  const owners = new Set<number>();

  for (const row of rows) {
    if (
      row.cwd === root &&
      taskIds.includes(row.taskId) &&
      !tracked.has(row.pid) &&
      isAlive(row.pid)
    ) {
      // prettier-ignore
      owners.add(row.pid);
    }
  }

  return [...owners];
};

/** The task ids a pid holds, for messages. */
export const tasksHeldBy = (
  rows: readonly RunningTaskRow[],
  pid: number,
): string[] => rows.filter((row) => row.pid === pid).map((row) => row.taskId);

/** What to tell the user when a start is blocked by someone else's lock on `taskId`. */
export const describeNxLock = (
  rows: readonly RunningTaskRow[],
  root: string,
  taskId: string,
  target: string,
): string => {
  const owners = rows.filter((row) => row.cwd === root && row.taskId === taskId).map((row) => row.pid); // prettier-ignore
  const holder = owners.length > 0 ? `held by nx pid ${[...new Set(owners)].join(', ')}` : 'recorded in .nx/workspace-data'; // prettier-ignore

  return `Nx's lock on ${taskId} is ${holder}, so a second \`nx run\` waits for it instead of starting. That nx is alive but nothing is serving through it (its launcher was killed, or its server died). \`pnpm worktree:serve --stop ${target}\` kills exactly that owner (and its children) in this worktree and clears the row; then start again.`; // prettier-ignore
};
