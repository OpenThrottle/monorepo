/**
 * The operator-run session-trajectory resegment CLI, in two sections. The
 * per-session planning lives in `./claude-resegment-session.ts`.
 *
 * - Arguments: {@link parseResegmentArgs} turns argv into {@link ResegmentOptions} (pure).
 * - Run: {@link runResegment} drives the sessions, {@link formatResegmentPlan} and
 *   {@link formatResegmentResult} print the report.
 */
import path from 'node:path';

import type { HookFetch } from '../index.ts';
import type {
  ResegmentSessionPlan,
  ResegmentSessionResult,
} from './claude-resegment-session.ts';
import {
  applySessionResegment,
  planSessionResegment,
} from './claude-resegment-session.ts';
import { resolveBackfillEndpoint } from './claude-transcript-backfill.ts';
import { defaultClaudeProjectsDir } from './claude-transcript-projects.ts';

// ── Arguments ──
// Argument parsing for the operator-run session-trajectory resegment CLI.
// Pure: argv in, a result out, so the flag rules are testable without spawning
// a process.

/** The CLI's usage line, printed on `--help` and after a bad flag. @public */
export const RESEGMENT_USAGE = `pnpm run telemetry:resegment --session <id> [--session <id> ...] [--dry-run] [--projects-dir <path>] [--repo-root <path>] [--timeout-ms <n>]`;

/**
 * A validated resegment invocation.
 *
 * @public
 */
export interface ResegmentOptions {
  readonly dryRun: boolean;
  readonly projectsDir: string;
  readonly repoRoot: string;
  readonly sessionIds: readonly string[];
  readonly timeoutMs: number;
}

/**
 * The outcome of parsing: options, a request for help, or a message saying what
 * was wrong.
 *
 * @public
 */
export type ParseResegmentArgsResult =
  | { readonly error: string; readonly kind: 'error' }
  | { readonly kind: 'help' }
  | { readonly kind: 'options'; readonly options: ResegmentOptions };

const DEFAULT_TIMEOUT_MS = 15_000;

const VALUE_FLAGS: ReadonlySet<string> = new Set([
  '--projects-dir',
  '--repo-root',
  '--session',
  '--timeout-ms',
]);

const BOOLEAN_FLAGS: ReadonlySet<string> = new Set(['--dry-run', '--help']);

/**
 * Parse `argv` (without the node and script entries). `--flag value` and
 * `--flag=value` both work; an unknown flag is an error rather than ignored.
 *
 * @public
 */
export const parseResegmentArgs = ({
  argv,
  cwd,
  env,
}: {
  argv: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
}): ParseResegmentArgsResult => {
  const flags = new Map<string, string[]>();
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
      const existing = flags.get(name) ?? [];
      flags.set(name, [...existing, value]);
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

  const sessionIds = flags.get('--session') ?? [];
  if (sessionIds.length === 0) {
    return { error: '--session is required at least once', kind: 'error' };
  }

  const timeoutRaw = flags.get('--timeout-ms')?.[0];
  const timeoutMs =
    timeoutRaw === undefined ? DEFAULT_TIMEOUT_MS : Number(timeoutRaw);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return {
      error: `--timeout-ms must be a positive integer: ${timeoutRaw}`,
      kind: 'error',
    };
  }

  const projectsDirValues = flags.get('--projects-dir');
  const repoRootValues = flags.get('--repo-root');

  return {
    kind: 'options',
    options: {
      dryRun: switches.has('--dry-run'),
      projectsDir: path.resolve(
        projectsDirValues?.[0] ?? defaultClaudeProjectsDir(),
      ),
      repoRoot: path.resolve(
        repoRootValues?.[0] ??
          env.CLAUDE_PROJECT_DIR ??
          env.OPEN_THROTTLE_REPO_ROOT ??
          cwd,
      ),
      sessionIds,
      timeoutMs,
    },
  };
};

// ── Run ──
// The resegment CLI's control flow and its plain-text report, separated from
// `process` so they can be driven from a test: plan each session, print the
// old/new step counts, and write only when this is not a dry run.

const taskLabel = (taskId: string | null): string => {
  return taskId === null ? 'plan-level' : `task ${taskId}`;
};

/**
 * The counts a resegment is about to act on. Printed before anything is sent,
 * and the whole output of `--dry-run`.
 *
 * @public
 */
export const formatResegmentPlan = ({
  dryRun,
  plan,
}: {
  dryRun: boolean;
  plan: ResegmentSessionPlan;
}): string => {
  const lines = [
    dryRun
      ? `session-trajectory-resegment: DRY RUN for ${plan.sessionId}, nothing will be written`
      : `session-trajectory-resegment: about to write for ${plan.sessionId}`,
    `transcript: ${plan.transcriptPath}`,
    `open (skipped) segments: ${plan.openSegments}; actions: ${plan.actions.length}`,
  ];
  for (const action of plan.actions) {
    if (action.action === 'insert') {
      lines.push(
        `  INSERT  ${taskLabel(action.taskId)}  steps ${action.newStepCount}`,
      );
      continue;
    }
    if (action.action === 'skip') {
      lines.push(
        `  SKIP    ${taskLabel(action.taskId)}  id ${action.id}  steps ${action.oldStepCount} -> ${action.newStepCount}`,
      );
      continue;
    }
    lines.push(
      `  UPDATE  ${taskLabel(action.taskId)}  id ${action.id}  steps ${action.oldStepCount} -> ${action.newStepCount}`,
    );
  }
  return `${lines.join('\n')}\n`;
};

/**
 * What a send did for one session.
 *
 * @public
 */
export const formatResegmentResult = (
  result: ResegmentSessionResult,
): string => {
  return `${[
    `replaced ${result.replaced}, inserted ${result.inserted}, skipped (identical) ${result.skipped}, failed ${result.failed}`,
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
 * Run one resegment across the requested sessions and return the process exit
 * code. Dry-run still talks to the server for the old step counts, but writes
 * nothing.
 *
 * @public
 */
export const runResegment = async ({
  endpoint,
  fetchImpl,
  options,
  stderr,
  stdout,
}: {
  endpoint?: { authToken: string; graphqlUrl: string } | null;
  fetchImpl?: HookFetch;
  options: ResegmentOptions;
  stderr: (text: string) => void;
  stdout: (text: string) => void;
}): Promise<number> => {
  const target = pickEndpoint(endpoint, options.repoRoot);
  if (target === null) {
    stderr(
      'no OpenThrottle endpoint (set OPENTHROTTLE_GRAPHQL_URL, and unset OPENTHROTTLE_TELEMETRY_OFFLINE); nothing was planned or written\n',
    );
    return 1;
  }

  let exitCode = 0;
  for (const sessionId of options.sessionIds) {
    // eslint-disable-next-line no-await-in-loop -- one session at a time so the report stays readable
    const planned = await planSessionResegment({
      authToken: target.authToken,
      fetchImpl,
      graphqlUrl: target.graphqlUrl,
      projectsDir: options.projectsDir,
      sessionId,
      timeoutMs: options.timeoutMs,
    });
    if (planned.kind === 'error') {
      stderr(`${planned.error}\n`);
      exitCode = 1;
      continue;
    }

    stdout(formatResegmentPlan({ dryRun: options.dryRun, plan: planned.plan }));
    if (options.dryRun) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop -- sequential per session
    const result = await applySessionResegment({
      authToken: target.authToken,
      fetchImpl,
      graphqlUrl: target.graphqlUrl,
      plan: planned.plan,
      timeoutMs: options.timeoutMs,
    });
    stdout(formatResegmentResult(result));
    if (result.failed > 0) {
      exitCode = 1;
    }
  }

  return exitCode;
};
