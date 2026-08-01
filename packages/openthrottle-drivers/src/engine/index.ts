/**
 * @description Driver-agnostic execution engine: `runDriverSync` / `runDriverAsync`. Generalized
 * from tools/workflows' `runShellIterationSync` / `runShellIterationAsync` with identical semantics
 * (`shell: true`, `stdio: ['inherit','pipe','pipe']`, stdout/stderr trim + `\n` merge, spawn-error
 * message passthrough, `<promise>ERROR</promise>` timeout/abort sentinels, streaming chunks,
 * SIGTERM→SIGKILL escalation) but with the Ralph logger replaced by an injectable {@link DriverLogger}.
 */

import { spawn, spawnSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import type { AgentDriver, DriverInvocationConfig } from '../types/index.ts';
import { escalateKill } from '../utils/child-kill.ts';
import { noopDriverLogger } from '../utils/logger.ts';
import type { DriverLogger } from '../utils/logger.ts';

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
}

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
  const command = driver.buildShellCommand(config);
  const { cwd, iteration } = config;

  const child = spawnSync(command, [], {
    cwd,
    encoding: 'utf-8',
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  const stdout = child.stdout?.trim() ?? '';
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
  const command = driver.buildShellCommand(config);
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
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let chunkCount = 0;
    let killReason: 'abort' | 'timeout' | undefined;
    let resolved = false;
    let stderr = '';
    let stdout = '';

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

      const stdoutTrim = stdout.trim();
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
