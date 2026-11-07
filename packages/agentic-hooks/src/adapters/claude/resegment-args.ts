/**
 * Argument parsing for the operator-run session-trajectory resegment CLI.
 * Pure: argv in, a result out, so the flag rules are testable without spawning
 * a process.
 */
import path from 'node:path';

import { defaultClaudeProjectsDir } from './transcript-projects.ts';

/** The CLI's usage line, printed on `--help` and after a bad flag. @public */
export const RESEGMENT_USAGE = `node .claude/hooks/session-trajectory-resegment.cjs --session <id> [--session <id> ...] [--dry-run] [--projects-dir <path>] [--repo-root <path>] [--timeout-ms <n>]`;

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
