/**
 * Argument parsing for the operator-run backfill CLI. Pure: argv in, a result
 * out, so the flag rules are testable without spawning a process.
 */
import path from 'node:path';

import { DEFAULT_BACKFILL_SINCE } from './transcript-backfill.ts';
import { defaultClaudeProjectsDir } from './transcript-projects.ts';

/** The CLI's usage line, printed on `--help` and after a bad flag. @public */
export const BACKFILL_USAGE =
  'node .claude/hooks/skill-usage-backfill.cjs [--dry-run] [--since <ISO>] [--until <ISO>] [--projects-dir <path>] [--repo-root <path>] [--no-worktrees] [--timeout-ms <n>]';

/**
 * A validated backfill invocation.
 *
 * @public
 */
export interface BackfillOptions {
  readonly dryRun: boolean;
  readonly includeWorktrees: boolean;
  readonly projectsDir: string;
  readonly repoRoot: string;
  /** ISO-8601, inclusive. */
  readonly since: string;
  readonly timeoutMs: number;
  /** ISO-8601, exclusive. */
  readonly until: string;
}

/**
 * The outcome of parsing: options, a request for help, or a message saying what
 * was wrong.
 *
 * @public
 */
export type ParseBackfillArgsResult =
  | { readonly error: string; readonly kind: 'error' }
  | { readonly kind: 'help' }
  | { readonly kind: 'options'; readonly options: BackfillOptions };

const DEFAULT_TIMEOUT_MS = 15_000;

const VALUE_FLAGS: ReadonlySet<string> = new Set([
  '--projects-dir',
  '--repo-root',
  '--since',
  '--timeout-ms',
  '--until',
]);

const BOOLEAN_FLAGS: ReadonlySet<string> = new Set([
  '--dry-run',
  '--help',
  '--no-worktrees',
]);

const toIso = (label: string, raw: string): string | Error => {
  const ms = Date.parse(raw);
  return /^\d{4}-\d{2}-\d{2}/.test(raw) && !Number.isNaN(ms)
    ? new Date(ms).toISOString()
    : new Error(`${label} is not an ISO-8601 date: ${raw}`);
};

/**
 * Parse `argv` (without the node and script entries). `--flag value` and
 * `--flag=value` both work; an unknown flag is an error rather than ignored, so
 * a typo in a one-off data command cannot silently widen what it does.
 *
 * `now` and `env` are injectable for tests. `repoRoot` defaults to the same
 * variables the hooks use, then the working directory.
 *
 * @public
 */
export const parseBackfillArgs = ({
  argv,
  cwd,
  env,
  now,
}: {
  argv: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  now: Date;
}): ParseBackfillArgsResult => {
  const flags = new Map<string, string>();
  const switches = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? '';
    const [name = '', inline] = token.startsWith('--')
      ? token.split(/=(.*)/s, 2)
      : [token];
    if (BOOLEAN_FLAGS.has(name) && inline === undefined) {
      switches.add(name);
    } else if (VALUE_FLAGS.has(name)) {
      const value = inline ?? argv[index + 1];
      if (value === undefined || value === '' || value.startsWith('--')) {
        return { error: `${name} needs a value`, kind: 'error' };
      }
      flags.set(name, value);
      if (inline === undefined) {
        index += 1;
      }
    } else {
      return { error: `unknown argument: ${token}`, kind: 'error' };
    }
  }

  if (switches.has('--help')) {
    return { kind: 'help' };
  }

  const since = toIso(
    '--since',
    flags.get('--since') ?? DEFAULT_BACKFILL_SINCE,
  );
  if (since instanceof Error) {
    return { error: since.message, kind: 'error' };
  }
  const until = toIso('--until', flags.get('--until') ?? now.toISOString());
  if (until instanceof Error) {
    return { error: until.message, kind: 'error' };
  }
  if (Date.parse(since) >= Date.parse(until)) {
    return {
      error: `--since (${since}) must be before --until (${until})`,
      kind: 'error',
    };
  }

  const timeoutRaw = flags.get('--timeout-ms');
  const timeoutMs =
    timeoutRaw === undefined ? DEFAULT_TIMEOUT_MS : Number(timeoutRaw);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return {
      error: `--timeout-ms must be a positive integer: ${timeoutRaw}`,
      kind: 'error',
    };
  }

  return {
    kind: 'options',
    options: {
      dryRun: switches.has('--dry-run'),
      includeWorktrees: !switches.has('--no-worktrees'),
      projectsDir: path.resolve(
        flags.get('--projects-dir') ?? defaultClaudeProjectsDir(),
      ),
      repoRoot: path.resolve(
        flags.get('--repo-root') ??
          env.CLAUDE_PROJECT_DIR ??
          env.OPEN_THROTTLE_REPO_ROOT ??
          cwd,
      ),
      since,
      timeoutMs,
      until,
    },
  };
};
