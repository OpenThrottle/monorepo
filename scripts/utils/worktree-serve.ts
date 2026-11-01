/**
 * @description The pure half of `pnpm worktree:serve`: argument parsing, which
 * Nx task runs for a target, which port the target binds, where its log and
 * pidfile live, the pidfile format, the primary-checkout refusal, the printed
 * probe, and the parsers for the output of `lsof`, `ps` and Nx's lock message.
 * Everything with a side effect (spawning, signalling, polling) lives in
 * `scripts/worktree_serve.ts`.
 *
 * Dependency-free (node builtins + the sibling script utils only): it runs under
 * bare Node, and it may run in a worktree that has not been `pnpm install`ed yet.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readEnvFile } from './env.ts';
import type { WorktreeDbMode } from './worktree-db.ts';
import { readWorktreeDbMode } from './worktree-db.ts';
import { PORT_BLOCK_SIZE } from './worktree-ports.ts';

/** The servers the helper can run. */
export const SERVE_TARGETS = ['developer', 'server'] as const;

export type ServeTarget = (typeof SERVE_TARGETS)[number];

/** How long a start waits for the port to bind (a cold worktree builds first). */
export const DEFAULT_TIMEOUT_SECONDS = 300;

/** Worktree-relative directory holding every target's log and pidfile (git-ignored). */
export const SERVE_STATE_DIR = '.worktree/logs';

/** Worktree-relative server .env, where the service-account bearer lives. */
export const SERVER_ENV_FILE = 'applications/openthrottle-server/.env';

/** The env key of the service-account token the probe authenticates with. */
export const PROBE_TOKEN_ENV_KEY = 'OPENTHROTTLE_MCP_AUTH_TOKEN';

/** The worktree-relative file pinning the worktree's port block. */
export const WORKTREE_PORTS_FILE = '.worktree-ports';

export interface ServeTargetSpec {
  /** Root `.env` key carrying the port the target binds. */
  readonly portEnvKey: string;
}

export const SERVE_TARGET_SPECS: Readonly<
  Record<ServeTarget, ServeTargetSpec>
> = {
  developer: { portEnvKey: 'OPENTHROTTLE_DEVELOPER_PORT' },
  server: { portEnvKey: 'OPENTHROTTLE_SERVER_PORT' },
};

export const isServeTarget = (
  value: string | undefined,
): value is ServeTarget => value === 'developer' || value === 'server';

/** What the command line asked for. */
export type ServeCommand =
  | { readonly kind: 'start'; readonly apiOnly: boolean; readonly target: ServeTarget; readonly timeoutSeconds: number } // prettier-ignore
  | { readonly kind: 'stop'; readonly target: ServeTarget | undefined }
  | { readonly kind: 'usage'; readonly message: string };

export const USAGE =
  'usage: pnpm worktree:serve <server|developer> [--api-only] [--timeout=<seconds>]\n' +
  '       pnpm worktree:serve --stop [server|developer]';

const usage = (message: string): ServeCommand => ({ kind: 'usage', message });

/** Parse `--timeout=<seconds>`; undefined when absent, NaN-safe. */
const parseTimeout = (
  args: readonly string[],
): number | 'invalid' | undefined => {
  const raw = args.find((arg) => arg.startsWith('--timeout='));

  if (raw === undefined) {
    return undefined;
  }

  const seconds = Number(raw.slice('--timeout='.length));

  return Number.isInteger(seconds) && seconds > 0 ? seconds : 'invalid';
};

/** Turn the script's own arguments into a command. Never throws. */
export const parseServeArgs = (args: readonly string[]): ServeCommand => {
  const known = (arg: string): boolean =>
    arg === '--api-only' || arg === '--stop' || arg.startsWith('--timeout=');
  const unknownFlag = args.find((arg) => arg.startsWith('--') && !known(arg));

  if (unknownFlag !== undefined) {
    return usage(`unknown flag ${unknownFlag}`);
  }

  const positionals = args.filter((arg) => !arg.startsWith('--'));
  const [target, ...extra] = positionals;

  if (extra.length > 0) {
    return usage(`unexpected argument ${extra[0]}`);
  }

  if (target !== undefined && !isServeTarget(target)) {
    return usage(`unknown target "${target}"`);
  }

  if (args.includes('--stop')) {
    return args.includes('--api-only') ||
      args.some((arg) => arg.startsWith('--timeout='))
      ? usage('--stop takes only an optional target')
      : { kind: 'stop', target };
  }

  if (target === undefined) {
    return usage('a target is required');
  }

  const apiOnly = args.includes('--api-only');

  if (apiOnly && target !== 'server') {
    return usage('--api-only applies to the server target only');
  }

  const timeout = parseTimeout(args);

  if (timeout === 'invalid') {
    return usage('--timeout takes a positive whole number of seconds');
  }

  return { apiOnly, kind: 'start', target, timeoutSeconds: timeout ?? DEFAULT_TIMEOUT_SECONDS }; // prettier-ignore
};

/**
 * The Nx task a target runs. The server runs `dev` (PROCESS_ROLE=all) by
 * default; that is safe in a shared-DB worktree because repeatables are gated
 * and the queue prefix is the worktree's own. `--api-only` runs `dev-api`.
 */
export const nxTaskId = (target: ServeTarget, apiOnly: boolean): string => {
  if (target === 'developer') {
    return 'openthrottle-developer:dev';
  }

  return apiOnly ? 'openthrottle-server:dev-api' : 'openthrottle-server:dev';
};

/** Every Nx task id the helper may start for a target (for stale-lock sweeps). */
export const nxTaskIds = (target: ServeTarget): readonly string[] =>
  target === 'developer'
    ? [nxTaskId('developer', false)]
    : [nxTaskId('server', false), nxTaskId('server', true)];

/** The argv that runs a task: always through Nx, prefixed with pnpm. */
export const nxArgv = (
  taskId: string,
): { readonly args: string[]; readonly command: string } => ({
  // prettier-ignore
  args: ['nx', 'run', taskId],
  command: 'pnpm',
});

export const logPath = (root: string, target: ServeTarget): string =>
  join(root, SERVE_STATE_DIR, `${target}.log`);

export const pidfilePath = (root: string, target: ServeTarget): string =>
  join(root, SERVE_STATE_DIR, `${target}.pid`);

/** What the pidfile records about a launched target. */
export interface PidRecord {
  readonly apiOnly: boolean;
  /** The process-group leader: the detached `pnpm`, whose pid is also the pgid. */
  readonly pid: number;
  readonly port: number;
  readonly startedAt: string;
  readonly task: string;
}

export const renderPidRecord = (record: PidRecord): string =>
  `${JSON.stringify(record, null, 2)}\n`;

const field = (value: object, key: string): unknown =>
  Object.entries(value).find(([name]) => name === key)?.[1];

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

/** Parse a pidfile; undefined for anything that is not a complete record. */
export const parsePidRecord = (contents: string): PidRecord | undefined => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    return undefined;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }

  const apiOnly = field(parsed, 'apiOnly');
  const pid = field(parsed, 'pid');
  const port = field(parsed, 'port');
  const startedAt = field(parsed, 'startedAt');
  const task = field(parsed, 'task');

  if (
    typeof apiOnly === 'boolean' &&
    isPositiveInteger(pid) &&
    isPositiveInteger(port) &&
    typeof startedAt === 'string' &&
    typeof task === 'string'
  ) {
    return { apiOnly, pid, port, startedAt, task };
  }

  return undefined;
};

/** The worktree's pinned port block base from `.worktree-ports` contents. */
export const parsePortBase = (contents: string): number | undefined => {
  const match = /^OT_PORT_BASE=(\d+)$/m.exec(contents);

  return match?.[1] === undefined ? undefined : Number(match[1]);
};

export type PortResolution =
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ok'; readonly port: number };

/**
 * Resolve the port a target binds for the worktree at `root` from the root
 * `.env` (`OPENTHROTTLE_SERVER_PORT` / `OPENTHROTTLE_DEVELOPER_PORT`). The port
 * must sit inside the worktree's own pinned block (`.worktree-ports`): `--stop`
 * falls back to killing the listener on this port, so a port that is not
 * provably the worktree's (the primary's 6020/6021, say) is refused outright.
 */
export const resolveServePort = (
  target: ServeTarget,
  rootEnv: Readonly<Record<string, string>>,
  portsFileContents: string | undefined,
): PortResolution => {
  const { portEnvKey } = SERVE_TARGET_SPECS[target];
  const raw = rootEnv[portEnvKey];
  const port = raw === undefined || raw === '' ? Number.NaN : Number(raw);

  if (!Number.isInteger(port) || port <= 0) {
    return { kind: 'error', message: `${portEnvKey} is not set to a port in this worktree's root .env` }; // prettier-ignore
  }

  const base = portsFileContents === undefined ? undefined : parsePortBase(portsFileContents); // prettier-ignore

  if (base === undefined) {
    return { kind: 'error', message: `${WORKTREE_PORTS_FILE} has no OT_PORT_BASE, so the worktree's port block is unknown; run \`pnpm worktree:heal\`` }; // prettier-ignore
  }

  if (port < base || port > base + PORT_BLOCK_SIZE - 1) {
    return { kind: 'error', message: `${portEnvKey}=${port} is outside this worktree's port block ${base}-${base + PORT_BLOCK_SIZE - 1}; refusing to start or kill anything on it` }; // prettier-ignore
  }

  return { kind: 'ok', port };
};

const readOptionalFile = (path: string): string | undefined => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
};

/** Read `.env` and `.worktree-ports` under `root` and resolve a target's port. */
export const readServePort = (
  root: string,
  target: ServeTarget,
): PortResolution =>
  resolveServePort(
    target,
    readEnvFile(join(root, '.env')),
    readOptionalFile(join(root, WORKTREE_PORTS_FILE)),
  );

/**
 * The reason the helper refuses to run in the checkout at `root`, or undefined
 * when it may. Only the `.env` marker counts (never an inherited environment
 * variable): the primary checkout has no `OT_WORKTREE_DB`, and it owns the
 * processes the user's MCP depends on.
 */
export const primaryRefusal = (
  mode: WorktreeDbMode,
  root: string,
): string | undefined =>
  mode === 'primary'
    ? `${root} is the primary checkout (no OT_WORKTREE_DB marker in its .env); worktree:serve only runs in a provisioned worktree and never touches the primary's processes` // prettier-ignore
    : undefined;

/** The refusal for the checkout at `root`, reading only its own `.env`. */
export const refusalForRoot = (root: string): string | undefined =>
  primaryRefusal(readWorktreeDbMode(root, {}), root);

/** The shell fragment that reads the worktree's bearer without printing it. */
const bearerExpression = (root: string): string =>
  `$(sed -n 's/^${PROBE_TOKEN_ENV_KEY}=//p' '${join(root, SERVER_ENV_FILE)}' | tail -n 1 | tr -d '"')`; // prettier-ignore

/**
 * The probe printed once a target is listening. The server probe queries
 * `listSources` with the worktree's own service-account bearer, which the shell
 * reads from the server `.env` at run time, so the token is never echoed.
 * `hasToken` false degrades to an unauthenticated `__typename` check.
 */
export const buildProbe = (
  root: string,
  target: ServeTarget,
  port: number,
  hasToken: boolean,
): string => {
  if (target === 'developer') {
    return `curl -sS -o /dev/null -w '%{http_code}\\n' http://localhost:${port}/`;
  }

  const query = hasToken
    ? '{"query":"query { listSources { sources { name } } }"}'
    : '{"query":"query { __typename }"}';
  const auth = hasToken ? ` -H "Authorization: Bearer ${bearerExpression(root)}"` : ''; // prettier-ignore

  return `curl -sS -X POST http://localhost:${port}/graphql -H 'Content-Type: application/json'${auth} --data '${query}'`; // prettier-ignore
};

/** The header line the helper writes into a target's log at every launch. */
export const launchHeader = (
  target: ServeTarget,
  commandLine: string,
  at: Date,
): string =>
  `\n--- ${at.toISOString()} worktree:serve ${target}: ${commandLine} ---\n`;

/**
 * The part of an append-only target log written by the latest launch (from its
 * header on), so lines left by earlier runs are never mistaken for this one's.
 */
export const currentLaunchLog = (log: string): string => {
  const index = log.lastIndexOf('\n--- ');

  return index < 0 ? log : log.slice(index);
};

/** Nx task ids a log says another Nx process is already running. */
export const nxLockWaits = (log: string): string[] => {
  const waits = new Set<string>();

  for (const match of log.matchAll(
    /Waiting for (\S+) in another nx process/g,
  )) {
    if (match[1] !== undefined) {
      waits.add(match[1]);
    }
  }

  return [...waits];
};

/** The last `count` lines of `text`, trailing blank lines dropped. */
export const tailLines = (text: string, count: number): string =>
  text.trimEnd().split('\n').slice(-count).join('\n');

/** `lsof -ti` output (one pid per line) as pids. */
export const parsePids = (output: string): number[] =>
  output
    .split('\n')
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);

export interface ProcessRow {
  readonly command: string;
  readonly pgid: number;
  readonly pid: number;
  readonly ppid: number;
}

/** Rows of `ps -axo pid=,ppid=,pgid=,command=`. */
export const parseProcessTable = (output: string): ProcessRow[] => {
  const rows: ProcessRow[] = [];

  for (const line of output.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);

    if (
      match?.[1] !== undefined &&
      match[2] !== undefined &&
      match[3] !== undefined
    ) {
      rows.push({ command: match[4] ?? '', pgid: Number(match[3]), pid: Number(match[1]), ppid: Number(match[2]) }); // prettier-ignore
    }
  }

  return rows;
};

/** `pid` and every process descended from it, in the process table. */
export const descendantPids = (
  table: readonly ProcessRow[],
  pid: number,
): number[] => {
  const found = new Set<number>([pid]);
  let grew = true;

  while (grew) {
    grew = false;

    for (const row of table) {
      if (found.has(row.ppid) && !found.has(row.pid)) {
        found.add(row.pid);
        grew = true;
      }
    }
  }

  return [...found];
};

/** True when `path` is the worktree at `root` or inside it. */
export const isInsideWorktree = (path: string, root: string): boolean =>
  path === root || path.startsWith(`${root}/`);

/** The directory `lsof -a -p <pid> -d cwd -Fn` printed, if any. */
export const parseLsofCwd = (output: string): string | undefined => {
  for (const line of output.split('\n')) {
    if (line.startsWith('n')) {
      return line.slice(1);
    }
  }

  return undefined;
};
