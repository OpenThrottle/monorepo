/**
 * @description Driver-agnostic execution engine: `runDriverSync` / `runDriverAsync`. Generalized
 * from tools/workflows' `runShellIterationSync` / `runShellIterationAsync` with identical semantics
 * (`shell: true`, stdout/stderr trim + `\n` merge, spawn-error
 * message passthrough, `<promise>ERROR</promise>` timeout/abort sentinels, streaming chunks,
 * SIGTERM→SIGKILL escalation) but with the Ralph logger replaced by an injectable {@link DriverLogger}.
 * A driver may add `parseOutput` (final text + usage limit from raw stdout) and `renderOutputLine`
 * (live, line-buffered stdout rendering for `onChunk`); drivers without them behave byte-identically.
 *
 * stdin is `ignore`d (see {@link DRIVER_STDIO}), not inherited: every driver takes its prompt as an
 * argument, and an inherited idle stdin pipe (an agent harness, a process manager) made claude wait
 * 3s per iteration ("no stdin data received in 3s") and would make a non-TTY CLI that reads stdin block forever.
 */

import type { ChildProcess } from 'child_process';
import { spawn, spawnSync } from 'child_process';

import type {
  AgentDriver,
  DriverInvocationConfig,
  DriverParsedOutput,
} from '../types/index.ts';
import { resolveDriverBinary } from '../utils/binary.ts';
import { escalateKill } from '../utils/child-kill.ts';
import type { DriverLogger } from '../utils/logger.ts';
import { noopDriverLogger } from '../utils/logger.ts';
import type { UsageLimit } from '../utils/usage-limit.ts';

/**
 * @description Child stdio for every driver run: no stdin (a driver never reads it — the prompt is
 * an argument), piped stdout/stderr. `ignore` gives the child `/dev/null`, so a CLI that probes a
 * non-TTY stdin sees EOF at once instead of waiting on the host's.
 */
const DRIVER_STDIO: ['ignore', 'pipe', 'pipe'] = ['ignore', 'pipe', 'pipe'];

/**
 * @description How a driver run ended: the child closed on its own, or the engine killed it.
 * @public
 */
export type DriverRunTermination = 'aborted' | 'exited' | 'timed-out';

/**
 * @description One run's unprocessed output, for {@link RunDriverOptions.onRawOutput}.
 * `exitCode` is `null` when the engine killed the child.
 * @public
 */
export interface DriverRawOutput {
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly termination: DriverRunTermination;
}

/**
 * @description Optional dependencies for a driver run. `logger` defaults to a no-op.
 * @public
 */
export interface RunDriverOptions {
  readonly logger?: DriverLogger;
  /**
   * Called by `runDriverAsync` with the child's exit code on a **normal** process close only — it
   * does NOT fire when the run ends via timeout or abort (those resolve with a `<promise>ERROR</promise>`
   * sentinel and no exit code). Callers use its absence to distinguish a killed run from a clean exit,
   * and its value to tell a zero (success) exit from a non-zero (failure) one. The `Promise<string>`
   * return is unchanged, so existing callers are unaffected.
   */
  readonly onExit?: (exitCode: number | null) => void;
  /**
   * Called by `runDriverAsync` with the run's RAW stdout and stderr — before `parseOutput` and the
   * merge — on every path that ends the child: a normal close, a timeout and an abort (but not a
   * launch failure, which rejects). This is what a run transcript is built from. It fires before
   * the run resolves and never changes the returned string.
   */
  readonly onRawOutput?: (output: DriverRawOutput) => void;
  /**
   * Called with the parsed {@link UsageLimit} when a run closes **normally** and the driver's
   * `parseOutput` found a subscription usage limit in its output (today only Claude emits one). Like
   * `onExit` it does NOT fire on timeout or abort, nor when the child fails to launch. It fires
   * before the run resolves (async: just before `onExit`) and never changes the returned string, so
   * existing callers are unaffected.
   */
  readonly onUsageLimit?: (usageLimit: UsageLimit) => void;
}

/**
 * @description Child env: `undefined` (inherit `process.env`, the historical behavior) unless the
 * caller supplied extra variables, which are merged over the inherited set.
 */
const mergeChildEnv = (
  extra: Readonly<Record<string, string>> | undefined,
): NodeJS.ProcessEnv | undefined => {
  return extra === undefined ? undefined : { ...process.env, ...extra };
};

/**
 * @description Builds the shell command with the executable resolved from the driver's `binEnv`
 * override in the child's effective env (inherited `process.env` + `config.env`) — the same rule
 * discovery and chat use — so a stub named by `OPENTHROTTLE_<X>_BIN` is what a plan or scheduled
 * run actually spawns, not whatever `<binary>` is first on PATH.
 */
const buildCommand = (
  driver: AgentDriver,
  config: DriverInvocationConfig,
): string => {
  const bin = resolveDriverBinary(driver, { ...process.env, ...config.env });

  return driver.buildShellCommand({ ...config, bin });
};

/**
 * @description Applies the driver's optional `parseOutput` to the raw collected stdout. Drivers
 * without one pass through untouched, so only drivers that opted in change behavior.
 */
const interpretStdout = (
  driver: AgentDriver,
  rawStdout: string,
): DriverParsedOutput => {
  return (
    driver.parseOutput?.(rawStdout) ?? { text: rawStdout, usageLimit: null }
  );
};

/**
 * @description Runs one driver invocation synchronously (spawnSync). Use for interactive/TTY
 * contexts. Returns the merged stdout/stderr, or the spawn-error message when the child fails to
 * launch.
 * @public
 */
export const runDriverSync = (
  driver: AgentDriver,
  config: DriverInvocationConfig,
  options: RunDriverOptions = {},
): string => {
  const logger = options.logger ?? noopDriverLogger;
  const command = buildCommand(driver, config);
  const { cwd, iteration } = config;

  const child = spawnSync(command, [], {
    cwd,
    encoding: 'utf-8',
    env: mergeChildEnv(config.env),
    shell: true,
    stdio: DRIVER_STDIO,
  });

  const parsed = interpretStdout(driver, child.stdout ?? '');
  const stdout = parsed.text.trim();
  const stderr = child.stderr?.trim() ?? '';
  const result = stderr ? `${stdout}\n${stderr}` : stdout;

  if (child.error) {
    logger.debug('runDriverSync: spawn error', {
      iteration,
      message: child.error.message,
      runnerLabel: driver.label,
    });

    return child.error.message;
  }

  if (parsed.usageLimit !== null) {
    options.onUsageLimit?.(parsed.usageLimit);
  }

  logger.debug('runDriverSync: runner exited', {
    exitCode: child.status,
    iteration,
    resultLen: result.length,
    runnerLabel: driver.label,
    stderrLen: stderr.length,
    stdoutLen: stdout.length,
  });

  return result;
};

/**
 * @description Runs one driver invocation asynchronously (spawn + Promise). Streams stdout/stderr
 * chunks to `config.onChunk`, honors `config.timeoutMs` and `config.signal` (both resolve with a
 * `<promise>ERROR</promise>` sentinel after an escalating kill), and rejects only on a child
 * process `error` event.
 * @public
 */
export const runDriverAsync = (
  driver: AgentDriver,
  config: DriverInvocationConfig,
  options: RunDriverOptions = {},
): Promise<string> => {
  const logger = options.logger ?? noopDriverLogger;
  const runnerLabel = driver.label;
  const command = buildCommand(driver, config);
  const { cwd, iteration, onChunk, signal, timeoutMs } = config;

  return new Promise((resolve, reject) => {
    logger.debug('runDriverAsync: spawning runner', {
      cwd: cwd ?? process.cwd(),
      iteration,
      runnerLabel,
      timeoutMs: timeoutMs ?? null,
    });

    const child: ChildProcess = spawn(command, [], {
      cwd,
      env: mergeChildEnv(config.env),
      shell: true,
      stdio: DRIVER_STDIO,
    });

    const startedAt = Date.now();
    let chunkCount = 0;
    let killReason: 'abort' | 'timeout' | undefined;
    let resolved = false;
    let stderr = '';
    let stdout = '';

    // Live rendering (drivers with `renderOutputLine`): stdout is line-buffered so a line split
    // across chunks renders once, whole. Raw stdout is still accumulated for `parseOutput`.
    const renderLine = driver.renderOutputLine;
    let pendingLine = '';

    const emitRendered = (line: string): void => {
      const rendered = renderLine?.(line) ?? null;

      if (rendered !== null) {
        onChunk?.({ data: `${rendered}\n`, stream: 'stdout' });
      }
    };

    const flushPendingLine = (): void => {
      if (pendingLine !== '') {
        const line = pendingLine;

        pendingLine = '';
        emitRendered(line);
      }
    };

    const push = (stream: 'stderr' | 'stdout', data: string): void => {
      if (stream === 'stdout') {
        stdout += data;
      } else {
        stderr += data;
      }

      chunkCount += 1;

      logger.verbose('runDriverAsync: chunk', {
        chunkIndex: chunkCount,
        chunkLen: data.length,
        runnerLabel,
        stderrLen: stderr.length,
        stdoutLen: stdout.length,
        stream,
      });

      if (renderLine !== undefined && stream === 'stdout') {
        const lines = (pendingLine + data).split('\n');

        pendingLine = lines.pop() ?? '';
        lines.forEach(emitRendered);

        return;
      }

      onChunk?.({ data, stream });
    };

    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => push('stdout', chunk));
    }

    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => push('stderr', chunk));
    }

    const killChild = (reason: 'abort' | 'timeout'): void => {
      if (killReason !== undefined) return;
      killReason = reason;

      escalateKill(child);
    };

    const onAbort = (): void => {
      if (signal?.aborted) killChild('abort');
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const done = (status: number | null): void => {
      if (resolved) return;

      resolved = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
      flushPendingLine();

      let termination: DriverRunTermination = 'exited';

      if (killReason === 'abort') {
        termination = 'aborted';
      } else if (killReason === 'timeout') {
        termination = 'timed-out';
      }

      options.onRawOutput?.({
        durationMs: Date.now() - startedAt,
        exitCode: termination === 'exited' ? status : null,
        stderr,
        stdout,
        termination,
      });

      if (killReason === 'timeout') {
        logger.debug('runDriverAsync: resolved after kill (timeout)', {
          chunkCount,
          iteration,
          runnerLabel,
          stderrLen: stderr.length,
          stdoutLen: stdout.length,
        });

        resolve(
          `<promise>ERROR</promise>\n${runnerLabel} iteration timed out after ${timeoutMs}ms`,
        );

        return;
      }

      if (killReason === 'abort') {
        logger.debug('runDriverAsync: resolved after kill (abort)', {
          chunkCount,
          iteration,
          runnerLabel,
          stderrLen: stderr.length,
          stdoutLen: stdout.length,
        });

        resolve(
          `<promise>ERROR</promise>\n${runnerLabel} iteration was cancelled`,
        );

        return;
      }

      const parsed = interpretStdout(driver, stdout);
      const stdoutTrim = parsed.text.trim();
      const stderrTrim = stderr.trim();
      const result = stderrTrim ? `${stdoutTrim}\n${stderrTrim}` : stdoutTrim;

      logger.debug('runDriverAsync: child closed (normal)', {
        chunkCount,
        exitCode: status,
        iteration,
        resultLen: result.length,
        runnerLabel,
        stderrLen: stderr.length,
        stdoutLen: stdout.length,
      });

      if (parsed.usageLimit !== null) {
        options.onUsageLimit?.(parsed.usageLimit);
      }

      options.onExit?.(status);
      resolve(result);
    };

    if (timeoutMs !== undefined && timeoutMs > 0) {
      timeoutId = setTimeout(() => killChild('timeout'), timeoutMs);
    }

    signal?.addEventListener('abort', onAbort);
    if (signal?.aborted) {
      killChild('abort');
    }

    child.on('close', (code) => done(code ?? null));
    child.on('error', (err) => {
      logger.debug('runDriverAsync: child process error', {
        chunkCount,
        err,
        iteration,
        runnerLabel,
        stderrLen: stderr.length,
        stdoutLen: stdout.length,
      });

      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
        reject(err);
      }
    });
  });
};
