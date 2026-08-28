/**
 * @description Typed child-process runner for repo scripts. Two modes:
 * `stdio: 'inherit'` streams straight to the terminal (long-running tools the
 * user watches), `stdio: 'capture'` (default) returns trimmed stdout/stderr
 * for programmatic use. Failures throw with the command line and captured
 * stderr unless `allowFailure` is set.
 *
 * Commands are argv arrays (no shell), so there is no quoting/injection
 * surface. Reach for `spawnSync` semantics: these are sequential scripts, not
 * servers.
 */
import { spawnSync } from 'node:child_process';
import type { SpawnSyncOptions } from 'node:child_process';

export interface RunOptions {
  /** Do not throw on a non-zero exit; inspect the result instead. */
  allowFailure?: boolean;
  /** Working directory; default process.cwd(). */
  cwd?: string;
  /** Extra environment merged over process.env. */
  env?: Record<string, string>;
  /** Feed this string to the child's stdin (capture mode only). */
  input?: string;
  /** 'capture' (default) returns output; 'inherit' streams to the terminal. */
  stdio?: 'capture' | 'inherit';
}

export interface RunResult {
  /** The rendered command line, for error messages and logging. */
  command: string;
  exitCode: number;
  /** Trimmed stderr — empty string in inherit mode. */
  stderr: string;
  /** Trimmed stdout — empty string in inherit mode. */
  stdout: string;
}

/** Render an argv array for human-facing messages. */
export const renderCommand = (command: string, args: string[]): string =>
  [command, ...args].join(' ');

/**
 * Run a command synchronously. Throws on non-zero exit (or spawn failure)
 * unless `allowFailure` is true.
 */
export const run = (
  command: string,
  args: string[] = [],
  options: RunOptions = {},
): RunResult => {
  const rendered = renderCommand(command, args);
  const spawnOptions: SpawnSyncOptions = {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env ? { ...process.env, ...options.env } : process.env,
    input: options.input,
    stdio: options.stdio === 'inherit' ? 'inherit' : 'pipe',
  };

  const outcome = spawnSync(command, args, spawnOptions);

  if (outcome.error) {
    if (options.allowFailure) {
      return { command: rendered, exitCode: 1, stderr: outcome.error.message, stdout: '' }; // prettier-ignore
    }

    throw new Error(`Failed to spawn \`${rendered}\`: ${outcome.error.message}`); // prettier-ignore
  }

  const result: RunResult = {
    command: rendered,
    exitCode: outcome.status ?? 1,
    stderr: typeof outcome.stderr === 'string' ? outcome.stderr.trim() : '',
    stdout: typeof outcome.stdout === 'string' ? outcome.stdout.trim() : '',
  };

  if (result.exitCode !== 0 && !options.allowFailure) {
    const suffix = result.stderr === '' ? '' : `\n${result.stderr}`;

    throw new Error(
      `\`${rendered}\` exited with code ${result.exitCode}${suffix}`,
    );
  }

  return result;
};
