/**
 * The operator-run telemetry backfill CLI, in two sections. The entrypoint is
 * `../scripts/claude-backfill.ts`; the transcript scan lives in
 * `./claude-transcript-backfill.ts`.
 *
 * - Arguments: {@link parseBackfillArgs} turns argv into {@link BackfillOptions} (pure).
 * - Run: {@link runBackfill} drives the scan, {@link formatBackfillPlan} and
 *   {@link formatBackfillResult} print the report.
 */
import path from 'node:path';

import type { HookFetch } from '../index.ts';
import type {
  BackfillPlan,
  BackfillSendResult,
  CountMap,
} from './claude-transcript-backfill.ts';
import {
  DEFAULT_BACKFILL_SINCE,
  resolveBackfillEndpoint,
  scanBackfill,
  sendBackfill,
} from './claude-transcript-backfill.ts';
import { defaultClaudeProjectsDir } from './claude-transcript-projects.ts';

// ── Arguments ──
// Argument parsing for the operator-run backfill CLI. Pure: argv in, a result
// out, so the flag rules are testable without spawning a process.

/** The CLI's usage line, printed on `--help` and after a bad flag. @public */
export const BACKFILL_USAGE = `pnpm run telemetry:backfill [--dry-run] [--since <ISO>] [--until <ISO>] [--projects-dir <path>] [--repo-root <path>] [--no-worktrees] [--timeout-ms <n>]`;

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

// ── Run ──
// The backfill's control flow and its plain-text report, separated from
// `process` so they can be driven from a test: scan, print the counts, and send
// only when this is not a dry run. `../scripts/claude-backfill.ts` is the thin
// entrypoint that feeds it argv and stdio.

const table = (counts: CountMap, indent: string): readonly string[] => {
  const entries = Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return entries.length === 0
    ? [`${indent}(none)`]
    : entries.map(([key, count]) => `${indent}${key}  ${count}`);
};

/**
 * The counts a backfill is about to act on. Printed before anything is sent,
 * and the whole output of `--dry-run`.
 *
 * @public
 */
export const formatBackfillPlan = ({
  dryRun,
  plan,
}: {
  dryRun: boolean;
  plan: BackfillPlan;
}): string => {
  const { skills, tokens } = plan;
  const lines = [
    dryRun
      ? 'skill-usage-backfill: DRY RUN, nothing will be sent'
      : 'skill-usage-backfill: about to send',
    `skill window: ${plan.since} (inclusive) to ${plan.until} (exclusive)`,
    `checkouts: ${plan.checkouts.length}; project directories: ${plan.projects.length}; transcript files read: ${plan.files}`,
  ];
  for (const project of plan.projects) {
    const stat = plan.stats[project.slug];
    lines.push(
      `  ${project.slug}  files ${stat?.files ?? 0}  skill events ${stat?.skills ?? 0}  token rows ${stat?.tokens ?? 0}`,
    );
  }
  if (plan.refusedFiles.length > 0) {
    lines.push(
      `refused ${plan.refusedFiles.length} transcript file(s) whose recorded cwd is outside this repository:`,
      ...plan.refusedFiles.map((file) => `  ${file}`),
    );
  }

  lines.push(
    '',
    `skill events to send: ${skills.events.length}`,
    ...table(skills.byPath, '  by path     '),
    `  outside window: ${skills.outsideWindow}; duplicate in transcripts: ${skills.duplicates}; no timestamp: ${skills.noTimestamp}`,
    `  slash commands keyed by line uuid (cannot match a live row): ${skills.keyedByFallback}`,
    '  by day:',
    ...table(skills.byDay, '    '),
    '  by project directory:',
    ...table(skills.byProject, '    '),
    '',
    `token rows to send (one per unique requestId): ${tokens.records.length}`,
    '  by day:',
    ...table(tokens.byDay, '    '),
    '  by project directory:',
    ...table(tokens.byProject, '    '),
  );
  return `${lines.join('\n')}\n`;
};

/**
 * What a send did.
 *
 * @public
 */
export const formatBackfillResult = (result: BackfillSendResult): string => {
  const { skills, tokens } = result;
  return `${[
    `skill events: accepted ${skills.accepted} (new or already present: the server answers with the surviving row), buffered ${skills.buffered}, rejected ${skills.rejected}`,
    `token rows: inserted ${tokens.inserted}, skipped as already present ${tokens.skipped}, buffered ${tokens.buffered}, dead-lettered ${tokens.deadLettered}${tokens.detail === null ? '' : ` (${tokens.detail})`}`,
    skills.buffered + tokens.buffered > 0
      ? 'buffered rows stay in ~/.openthrottle/skill-usage/; run `pnpm run telemetry:drain` once the server is reachable'
      : 'nothing buffered',
  ].join('\n')}\n`;
};

const pickEndpoint = (
  injected: { authToken: string; graphqlUrl: string } | null | undefined,
  repoRoot: string,
): { authToken: string; graphqlUrl: string } | null => {
  if (injected === undefined) {
    return resolveBackfillEndpoint({ repoRoot });
  }
  return injected;
};

/**
 * Run one backfill and return the process exit code. The plan's counts are
 * written BEFORE any request, so an operator who interrupts has already seen
 * what was about to go out. A dry run returns right after printing them and
 * never builds an endpoint, a request or a buffer file.
 *
 * `endpoint` and `fetchImpl` are injectable for tests; by default the endpoint
 * is resolved like the hooks resolve theirs.
 *
 * @public
 */
export const runBackfill = async ({
  endpoint,
  fetchImpl,
  options,
  stderr,
  stdout,
}: {
  endpoint?: { authToken: string; graphqlUrl: string } | null;
  fetchImpl?: HookFetch;
  options: BackfillOptions;
  stderr: (text: string) => void;
  stdout: (text: string) => void;
}): Promise<number> => {
  const plan = scanBackfill(options);
  stdout(formatBackfillPlan({ dryRun: options.dryRun, plan }));
  if (options.dryRun) {
    return 0;
  }

  const target = pickEndpoint(endpoint, options.repoRoot);
  if (target === null) {
    stderr(
      'no OpenThrottle endpoint to send to (set OPENTHROTTLE_GRAPHQL_URL, and unset OPENTHROTTLE_TELEMETRY_OFFLINE); nothing was sent or buffered\n',
    );
    return 1;
  }

  const result = await sendBackfill({
    ...target,
    fetchImpl,
    plan,
    repoRoot: options.repoRoot,
    timeoutMs: options.timeoutMs,
  });
  stdout(formatBackfillResult(result));
  return 0;
};
