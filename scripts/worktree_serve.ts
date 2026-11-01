#!/usr/bin/env node
/**
 * @description `pnpm worktree:serve` — run, wait for and probe a worktree's
 * server or developer app, then stop it again.
 *
 *   pnpm worktree:serve <server|developer> [--api-only] [--timeout=<seconds>]
 *   pnpm worktree:serve --stop [server|developer]
 *
 * Why a helper: a `dev` backgrounded from an agent's shell is reaped with that
 * shell (even under `nohup` + `disown`), there is no clean wait-until-listening,
 * unscoped kills risk the primary checkout's server, and a killed run leaves a
 * stale `Waiting for <project>:dev in another nx process` lock behind.
 *
 * - Refuses to run in the primary checkout (no `OT_WORKTREE_DB` marker).
 * - Starts `pnpm nx run openthrottle-server:dev` (`dev-api` with `--api-only`)
 *   or `openthrottle-developer:dev` with `spawn(..., { detached: true })`, which
 *   calls `setsid()` itself (macOS has no `setsid` binary), so the process group
 *   outlives the launching command. Output goes to `.worktree/logs/<target>.log`,
 *   the process-group leader to `.worktree/logs/<target>.pid`.
 * - Blocks until `OPENTHROTTLE_SERVER_PORT` / `OPENTHROTTLE_DEVELOPER_PORT`
 *   binds; on timeout prints the log tail and exits non-zero.
 * - Prints a ready-to-run `curl` probe. The server probe authenticates with the
 *   worktree's own service-account bearer, read from its server `.env` by the
 *   shell at run time, so the token is never echoed.
 * - `--stop` signals the process GROUP from the pidfile (plus its descendants),
 *   then falls back to whatever still listens on the target's port. Every
 *   signal is scoped: to the pidfile's group or to a pid whose cwd is inside
 *   this worktree. There is no process-name pkill anywhere.
 * - Idempotent: a target that is already up reports its port and pid.
 *
 * Runs under bare Node (native type stripping). A process supervisor is out of
 * scope; this only launches, waits, probes and stops.
 */
import { spawn } from 'node:child_process';
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readEnvValue } from './utils/env.ts';
import { run } from './utils/exec.ts';
import { createLogger } from './utils/logger.ts';
import {
  deleteRunningTaskRows,
  describeNxLock,
  orphanedNxOwners,
  readRunningTasks,
  tasksHeldBy,
} from './utils/nx-running-tasks.ts';
import { isPortListening } from './utils/worktree-ports.ts';
import type { PidRecord, ServeTarget } from './utils/worktree-serve.ts';
import {
  buildProbe,
  currentLaunchLog,
  descendantPids,
  isInsideWorktree,
  launchHeader,
  logPath,
  nxArgv,
  nxLockWaits,
  nxTaskId,
  nxTaskIds,
  parseLsofCwd,
  parsePidRecord,
  parsePids,
  parseProcessTable,
  parseServeArgs,
  pidfilePath,
  PROBE_TOKEN_ENV_KEY,
  readServePort,
  refusalForRoot,
  renderPidRecord,
  SERVE_STATE_DIR,
  SERVE_TARGET_SPECS,
  SERVE_TARGETS,
  SERVER_ENV_FILE,
  tailLines,
  USAGE,
} from './utils/worktree-serve.ts';

const logger = createLogger();

const POLL_MS = 500;
const PROGRESS_EVERY_MS = 15_000;
const STOP_GRACE_MS = 10_000;
/** How long an `Waiting for ... in another nx process` line may sit before it is called a stuck lock. */
const LOCK_GRACE_MS = 3_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

/** True when `pid` exists (EPERM still means it exists). */
export const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    return isErrnoException(error) && error.code === 'EPERM';
  }
};

/** True when anything in process group `pgid` is still alive. */
const isGroupAlive = (pgid: number): boolean => {
  try {
    process.kill(-pgid, 0);

    return true;
  } catch (error) {
    return isErrnoException(error) && error.code === 'EPERM';
  }
};

const processCwd = (pid: number): string | undefined => {
  const result = run('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { allowFailure: true }); // prettier-ignore

  return result.exitCode === 0 ? parseLsofCwd(result.stdout) : undefined;
};

const processCommand = (pid: number): string =>
  run('ps', ['-o', 'command=', '-p', String(pid)], { allowFailure: true }).stdout; // prettier-ignore

/**
 * True when `pid` demonstrably belongs to the worktree at `root`: its working
 * directory is inside it, or its command line names it. This is the guard in
 * front of every signal, so a recycled pid or a foreign listener on a port is
 * never killed.
 */
export const ownedByWorktree = (pid: number, root: string): boolean => {
  const cwd = processCwd(pid);

  if (cwd !== undefined && isInsideWorktree(cwd, root)) {
    return true;
  }

  return processCommand(pid).includes(`${root}/`);
};

const listenerPids = (port: number): number[] =>
  parsePids(run('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { allowFailure: true }).stdout); // prettier-ignore

const processTable = (): ReturnType<typeof parseProcessTable> =>
  parseProcessTable(run('ps', ['-axo', 'pid=,ppid=,pgid=,command='], { allowFailure: true }).stdout); // prettier-ignore

const readPidRecord = (
  root: string,
  target: ServeTarget,
): PidRecord | undefined => {
  try {
    return parsePidRecord(readFileSync(pidfilePath(root, target), 'utf8'));
  } catch {
    return undefined;
  }
};

const readLog = (root: string, target: ServeTarget): string => {
  try {
    return readFileSync(logPath(root, target), 'utf8');
  } catch {
    return '';
  }
};

const printLogTail = (root: string, target: ServeTarget): void => {
  const tail = tailLines(readLog(root, target), 30);

  logger.info(`--- last lines of ${logPath(root, target)} ---`);
  logger.info(tail === '' ? '(log is empty)' : tail);
};

const probeLines = (root: string, target: ServeTarget, port: number): void => {
  const hasToken = target === 'server' && readEnvValue(join(root, SERVER_ENV_FILE), PROBE_TOKEN_ENV_KEY) !== ''; // prettier-ignore

  if (target === 'server' && !hasToken) {
    logger.warn(`${PROBE_TOKEN_ENV_KEY} is not set in ${SERVER_ENV_FILE}; the probe below is unauthenticated`); // prettier-ignore
  }

  logger.info(`probe (${target === 'server' ? 'GraphQL listSources, worktree service-account bearer' : 'HTTP status of /'}):`); // prettier-ignore
  logger.info(buildProbe(root, target, port, hasToken));
  logger.info(`stop: pnpm worktree:serve --stop ${target}`);
};

/**
 * Signal a process group and its descendants (some tools put their children in
 * their own group), escalating from SIGTERM to SIGKILL. Returns once the group
 * is gone or the grace period ran out.
 */
const killGroup = async (pgid: number, root: string): Promise<void> => {
  const table = processTable();
  const members = descendantPids(table, pgid).filter((pid) => table.some((row) => row.pid === pid && ownedByWorktree(pid, root))); // prettier-ignore

  const signalAll = (signal: NodeJS.Signals): void => {
    try {
      process.kill(-pgid, signal);
    } catch {
      // The group is already gone.
    }

    for (const pid of members) {
      try {
        process.kill(pid, signal);
      } catch {
        // Already exited.
      }
    }
  };

  signalAll('SIGTERM');

  const deadline = Date.now() + STOP_GRACE_MS;

  while (
    Date.now() < deadline &&
    (isGroupAlive(pgid) || members.some(isAlive))
  ) {
    // Polling for exit; there is no event for a non-child.
    // eslint-disable-next-line no-await-in-loop
    await sleep(200);
  }

  if (isGroupAlive(pgid) || members.some(isAlive)) {
    signalAll('SIGKILL');
    await sleep(500);
  }
};

const removePidfile = (root: string, target: ServeTarget): void => {
  rmSync(pidfilePath(root, target), { force: true });
};

/** The processes that make `target` look up: a live, worktree-owned pidfile pid. */
const liveRecord = (
  root: string,
  target: ServeTarget,
): PidRecord | undefined => {
  const record = readPidRecord(root, target);

  return record !== undefined && isAlive(record.pid) && ownedByWorktree(record.pid, root) ? record : undefined; // prettier-ignore
};

/** Pids of every live helper-launched process tree in this worktree. */
const trackedPids = (root: string): Set<number> => {
  const table = processTable();
  const tracked = new Set<number>();

  for (const target of SERVE_TARGETS) {
    const record = liveRecord(root, target);

    if (record !== undefined) {
      for (const pid of descendantPids(table, record.pid)) {
        tracked.add(pid);
      }
    }
  }

  return tracked;
};

/**
 * Clear a stale Nx lock: kill any nx process in THIS worktree that still holds
 * one of `target`'s tasks without being a helper-launched process (an orphan:
 * its launcher died, nothing serves through it, yet its rows block every new
 * `dev`), together with its children, and delete its rows. See
 * ./utils/nx-running-tasks.ts for the mechanism. Returns true if it killed any.
 */
const reapOrphanedNx = async (
  root: string,
  target: ServeTarget,
): Promise<boolean> => {
  const rows = readRunningTasks(root);
  const owners =
    orphanedNxOwners(rows, root, nxTaskIds(target), trackedPids(root), isAlive) // prettier-ignore
      .filter((pid) => ownedByWorktree(pid, root));

  for (const pid of owners) {
    logger.warn(`stale Nx lock: nx pid ${pid} (orphaned: no helper launcher) still holds ${tasksHeldBy(rows, pid).filter((id) => nxTaskIds(target).includes(id)).join(', ')} (and ${tasksHeldBy(rows, pid).length - 1} other running task(s)); killing it and its children`); // prettier-ignore
    // eslint-disable-next-line no-await-in-loop
    await killGroup(pid, root);
  }

  deleteRunningTaskRows(root, owners);

  return owners.length > 0;
};

/** Wait for the port; returns an exit code. Failure paths print the log tail. */
const waitForPort = async (
  root: string,
  target: ServeTarget,
  record: PidRecord,
  timeoutSeconds: number,
): Promise<number> => {
  const started = Date.now();
  const deadline = started + timeoutSeconds * 1000;
  let lastProgress = started;
  let lockSeenAt: number | undefined;

  logger.step(`waiting up to ${timeoutSeconds}s for ${target} to listen on :${record.port} (log: ${logPath(root, target)})`); // prettier-ignore

  while (Date.now() < deadline) {
    if (isPortListening(record.port)) {
      logger.success(`${target} is listening on :${record.port} (pid ${record.pid}, ${Math.round((Date.now() - started) / 1000)}s)`); // prettier-ignore

      return 0;
    }

    if (!isAlive(record.pid)) {
      logger.fail(
        `${target} (${record.task}) exited before binding :${record.port}`,
      );
      printLogTail(root, target);
      removePidfile(root, target);

      return 1;
    }

    const locked = nxLockWaits(currentLaunchLog(readLog(root, target))).includes(record.task); // prettier-ignore

    if (locked && lockSeenAt === undefined) {
      lockSeenAt = Date.now();
    }

    if (lockSeenAt !== undefined && Date.now() - lockSeenAt > LOCK_GRACE_MS) {
      logger.fail(`${record.task} is blocked: Nx says it is already running in another nx process`); // prettier-ignore
      logger.info(
        describeNxLock(readRunningTasks(root), root, record.task, target),
      );
      printLogTail(root, target);
      // eslint-disable-next-line no-await-in-loop
      await killGroup(record.pid, root);
      removePidfile(root, target);

      // eslint-disable-next-line no-await-in-loop
      if (await reapOrphanedNx(root, target)) {
        logger.info(`cleared it; re-run \`pnpm worktree:serve ${target}\``);
      }

      return 1;
    }

    if (Date.now() - lastProgress >= PROGRESS_EVERY_MS) {
      lastProgress = Date.now();
      logger.detail(`still waiting for :${record.port} (${Math.round((Date.now() - started) / 1000)}s): ${tailLines(readLog(root, target), 1)}`); // prettier-ignore
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(POLL_MS);
  }

  logger.fail(
    `${target} did not listen on :${record.port} within ${timeoutSeconds}s`,
  );
  printLogTail(root, target);
  logger.info(`it is still running (pid ${record.pid}); re-run \`pnpm worktree:serve ${target}\` to keep waiting, or \`pnpm worktree:serve --stop ${target}\` to stop it`); // prettier-ignore

  return 1;
};

/** Start (or find, or keep waiting for) one target. Returns the exit code. */
export const start = async (
  root: string,
  target: ServeTarget,
  apiOnly: boolean,
  timeoutSeconds: number,
): Promise<number> => {
  const refusal = refusalForRoot(root);

  if (refusal !== undefined) {
    logger.fail(refusal);

    return 1;
  }

  const resolution = readServePort(root, target);

  if (resolution.kind === 'error') {
    logger.fail(resolution.message);

    return 1;
  }

  const { port } = resolution;
  const task = nxTaskId(target, apiOnly);
  const existing = liveRecord(root, target);

  if (existing !== undefined) {
    if (existing.task !== task) {
      logger.fail(`${target} is already running as ${existing.task} (pid ${existing.pid}); stop it first (pnpm worktree:serve --stop ${target}) to run ${task}`); // prettier-ignore

      return 1;
    }

    if (isPortListening(port)) {
      logger.success(`${target} is already up: listening on :${port}, pid ${existing.pid} (listener pid ${listenerPids(port).join(', ')}; ${existing.task}, started ${existing.startedAt})`); // prettier-ignore
      probeLines(root, target, port);

      return 0;
    }

    logger.step(`${target} is already starting (pid ${existing.pid}); waiting for it instead of starting a second one`); // prettier-ignore

    const code = await waitForPort(root, target, existing, timeoutSeconds);

    if (code === 0) {
      probeLines(root, target, port);
    }

    return code;
  }

  removePidfile(root, target);

  if (isPortListening(port)) {
    const pids = listenerPids(port);
    const mine =
      pids.length > 0 && pids.every((pid) => ownedByWorktree(pid, root));

    if (mine) {
      logger.success(`${target} is already up: listening on :${port}, pid ${pids.join(', ')} (not started by this helper; \`--stop\` still stops it by port)`); // prettier-ignore
      probeLines(root, target, port);

      return 0;
    }

    logger.fail(`:${port} is already in use by a process that is not in this worktree (pid ${pids.join(', ') || 'unknown'}); not touching it`); // prettier-ignore

    return 1;
  }

  await reapOrphanedNx(root, target);

  mkdirSync(join(root, SERVE_STATE_DIR), { recursive: true });

  const logFd = openSync(logPath(root, target), 'a');
  const { args, command } = nxArgv(task);

  writeFileSync(logPath(root, target), launchHeader(target, `${command} ${args.join(' ')}`, new Date()), { flag: 'a' }); // prettier-ignore

  const portEnv = { PORT: String(port), [SERVE_TARGET_SPECS[target].portEnvKey]: String(port) }; // prettier-ignore
  const child = spawn(command, args, {
    cwd: root,
    // detached => setsid(): the child leads its own session and process group,
    // so it survives the launching shell and `--stop` can signal the group.
    detached: true,
    env: { ...process.env, ...portEnv, NX_TUI: 'false' },
    stdio: ['ignore', logFd, logFd],
  });

  closeSync(logFd);

  if (child.pid === undefined) {
    logger.fail(`could not spawn \`${command} ${args.join(' ')}\``);

    return 1;
  }

  child.unref();

  const record: PidRecord = {
    apiOnly,
    pid: child.pid,
    port,
    startedAt: new Date().toISOString(),
    task,
  };

  writeFileSync(pidfilePath(root, target), renderPidRecord(record));
  logger.step(`started ${task} (pid/pgid ${record.pid}, detached)`);

  const code = await waitForPort(root, target, record, timeoutSeconds);

  if (code === 0) {
    probeLines(root, target, port);
  }

  return code;
};

/** Stop one target's process group, then whatever still listens on its port. */
const stopTarget = async (
  root: string,
  target: ServeTarget,
): Promise<boolean> => {
  let stoppedAnything = false;
  const record = readPidRecord(root, target);

  if (
    record !== undefined &&
    isAlive(record.pid) &&
    ownedByWorktree(record.pid, root)
  ) {
    logger.step(`stopping ${target}: process group ${record.pid}`);
    await killGroup(record.pid, root);
    stoppedAnything = true;
  } else if (record !== undefined && isAlive(record.pid)) {
    logger.warn(`${pidfilePath(root, target)} names pid ${record.pid}, which is not in this worktree (stale pidfile, recycled pid); not signalling it`); // prettier-ignore
  }

  removePidfile(root, target);

  if (await reapOrphanedNx(root, target)) {
    stoppedAnything = true;
  }

  const resolution = readServePort(root, target);

  if (resolution.kind === 'ok') {
    for (const pid of listenerPids(resolution.port)) {
      if (ownedByWorktree(pid, root)) {
        logger.step(
          `stopping the listener still on :${resolution.port}: pid ${pid}`,
        );
        // eslint-disable-next-line no-await-in-loop
        await killGroup(pid, root);
        stoppedAnything = true;
      } else {
        logger.warn(`pid ${pid} listens on :${resolution.port} but is not in this worktree; leaving it alone`); // prettier-ignore
      }
    }
  } else {
    logger.warn(`${resolution.message}; skipped the port fallback`);
  }

  return stoppedAnything;
};

/** Stop one target, or both. Returns the exit code (non-zero if something still listens). */
export const stop = async (
  root: string,
  target: ServeTarget | undefined,
): Promise<number> => {
  const refusal = refusalForRoot(root);

  if (refusal !== undefined) {
    logger.fail(refusal);

    return 1;
  }

  const targets = target === undefined ? SERVE_TARGETS : [target];
  let failed = false;

  for (const name of targets) {
    // eslint-disable-next-line no-await-in-loop
    const stopped = await stopTarget(root, name);
    const resolution = readServePort(root, name);

    if (resolution.kind === 'ok' && isPortListening(resolution.port)) {
      logger.fail(
        `:${resolution.port} still has a listener after stopping ${name}`,
      );
      failed = true;
    } else {
      logger.success(stopped ? `${name} stopped; nothing listens on its port` : `${name} was not running; nothing listens on its port`); // prettier-ignore
    }
  }

  return failed ? 1 : 0;
};

/** The checkout containing `cwd` (git's top level); `cwd` itself outside a repo. */
const checkoutRoot = (cwd: string): string => {
  const result = run('git', ['rev-parse', '--show-toplevel'], {
    allowFailure: true,
    cwd,
  });

  return result.exitCode === 0 && result.stdout !== '' ? result.stdout : cwd;
};

const main = async (args: readonly string[]): Promise<number> => {
  const command = parseServeArgs(args);

  if (command.kind === 'usage') {
    logger.fail(command.message);
    logger.info(USAGE);

    return 2;
  }

  const root = checkoutRoot(process.cwd());

  return command.kind === 'stop'
    ? stop(root, command.target)
    : start(root, command.target, command.apiOnly, command.timeoutSeconds);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
