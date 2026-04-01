/**
 * @description Single-iteration runner for Ralph (sync and async). Injected by ralph.ts so tests can mock it.
 */

import { spawn } from 'child_process';
import { spawnSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import { ARTWORK_LINE, COLORS } from '../config/index';
import { ralphDebugLogger } from '../utils/ralph-debug-logger';

/** Chunk from cursor-agent stdout or stderr when using async spawn. */
export interface CursorAgentChunk {
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
}

export interface RunIterationConfig {
  /** Full prompt string for cursor-agent (-p value); includes injected plan/tasks and Plan-Id (and optional Task-Id). */
  agentPrompt: string;
  /** Iteration number. */
  iteration: number;
  /** Cursor model to use. */
  model?: string;
  /** Optional per-iteration timeout in ms (async path only). On expiry, child is killed (SIGTERM then SIGKILL). */
  timeoutMs?: number;
  /** Optional AbortSignal to cancel the iteration (async path only). */
  signal?: AbortSignal;
  /** Optional callback for each stdout/stderr chunk (async path only). */
  onChunk?: (chunk: CursorAgentChunk) => void;
}

/** Grace period in ms after SIGTERM before sending SIGKILL (cursor-agent). */
const SIGKILL_GRACE_MS = 10_000;

/**
 * @description Escapes a string for safe use inside a double-quoted shell argument.
 * Prevents plan/task text containing " or \ from breaking the shell command.
 */
function escapeForShellDoubleQuoted(prompt: string): string {
  return prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @description Executes a single iteration of the agentic process (sync). Use when running interactively (TTY).
 */
export const runIteration = (config: RunIterationConfig): string => {
  const { agentPrompt, iteration, model } = config;
  const message = `🤖 Running iteration ${COLORS.green}${iteration}${COLORS.reset}\n`;

  console.log(`\n${ARTWORK_LINE}\n`);
  console.log(message);

  const modelFlag = model ? ` --model ${model}` : '';
  const safePrompt = escapeForShellDoubleQuoted(agentPrompt);
  const command = `cursor-agent --force -p "${safePrompt}"${modelFlag}`;
  const child = spawnSync(command, [], {
    encoding: 'utf-8',
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  const stdout = child.stdout?.trim() ?? '';
  const stderr = child.stderr?.trim() ?? '';
  const result = stderr ? `${stdout}\n${stderr}` : stdout;

  if (child.error) {
    ralphDebugLogger.debug('runIteration (sync): spawn error', {
      iteration,
      message: child.error.message,
    });
    return child.error.message;
  }

  ralphDebugLogger.debug('runIteration (sync): cursor-agent exited', {
    exitCode: child.status,
    iteration,
    resultLen: result.length,
    stderrLen: stderr.length,
    stdoutLen: stdout.length,
  });

  return result;
};

/**
 * @description Executes a single iteration using spawn + Promise. Use when non-interactive for streaming and per-iteration timeout/cancel.
 * On timeout or abort, kills child with SIGTERM then SIGKILL after grace; returns a string that triggers hasError so the CLI exits(1).
 */
export const runIterationAsync = (
  config: RunIterationConfig,
): Promise<string> => {
  const { agentPrompt, iteration, model, timeoutMs, signal, onChunk } = config;
  const message = `🤖 Running iteration ${COLORS.green}${iteration}${COLORS.reset}\n`;

  console.log(`\n${ARTWORK_LINE}\n`);
  console.log(message);

  const modelFlag = model ? ` --model ${model}` : '';
  const safePrompt = escapeForShellDoubleQuoted(agentPrompt);
  const command = `cursor-agent --force -p "${safePrompt}"${modelFlag}`;

  return new Promise((resolve, reject) => {
    ralphDebugLogger.debug('runIterationAsync: spawning cursor-agent', {
      iteration,
      timeoutMs: timeoutMs ?? null,
    });

    const child: ChildProcess = spawn(command, [], {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killReason: 'timeout' | 'abort' | undefined;
    let resolved = false;
    let chunkCount = 0;

    const push = (stream: 'stdout' | 'stderr', data: string): void => {
      if (stream === 'stdout') stdout += data;
      else stderr += data;
      chunkCount += 1;
      ralphDebugLogger.verbose('runIterationAsync: chunk', {
        chunkIndex: chunkCount,
        chunkLen: data.length,
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

    const killChild = (reason: 'timeout' | 'abort'): void => {
      if (killReason !== undefined) return;
      killReason = reason;

      if (child.killed) return;
      child.kill('SIGTERM');

      const killTimeout = setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, SIGKILL_GRACE_MS);

      child.once('close', () => clearTimeout(killTimeout));
    };

    const onAbort = (): void => {
      if (signal?.aborted) killChild('abort');
    };

    const done = (_status: number | null): void => {
      if (resolved) return;

      resolved = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);

      if (killReason === 'timeout') {
        ralphDebugLogger.debug(
          'runIterationAsync: resolved after kill (timeout)',
          {
            chunkCount,
            iteration,
            stderrLen: stderr.length,
            stdoutLen: stdout.length,
          },
        );
        resolve(
          `<promise>ERROR</promise>\ncursor-agent iteration timed out after ${timeoutMs}ms`,
        );
        return;
      }

      if (killReason === 'abort') {
        ralphDebugLogger.debug(
          'runIterationAsync: resolved after kill (abort)',
          {
            chunkCount,
            iteration,
            stderrLen: stderr.length,
            stdoutLen: stdout.length,
          },
        );
        resolve(
          '<promise>ERROR</promise>\ncursor-agent iteration was cancelled',
        );
        return;
      }

      const stdoutTrim = stdout.trim();
      const stderrTrim = stderr.trim();
      const result = stderrTrim ? `${stdoutTrim}\n${stderrTrim}` : stdoutTrim;

      ralphDebugLogger.debug('runIterationAsync: child closed (normal)', {
        chunkCount,
        exitCode: _status,
        iteration,
        resultLen: result.length,
        stderrLen: stderr.length,
        stdoutLen: stdout.length,
      });

      resolve(result);
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs !== undefined && timeoutMs > 0) {
      timeoutId = setTimeout(() => killChild('timeout'), timeoutMs);
    }

    signal?.addEventListener('abort', onAbort);
    if (signal?.aborted) {
      killChild('abort');
    }

    child.on('close', (code) => done(code ?? null));
    child.on('error', (err) => {
      ralphDebugLogger.debug('runIterationAsync: child process error', {
        chunkCount,
        err,
        iteration,
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
