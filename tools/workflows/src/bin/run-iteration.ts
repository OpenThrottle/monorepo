/**
 * @description Single-iteration runner for Ralph (sync and async). Injected by ralph.ts so tests can mock it.
 * Dispatches to a {@link RalphExecutionBackendId} implementation (today: Cursor `cursor-agent`).
 */

import { spawn } from 'child_process';
import { spawnSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import { ARTWORK_LINE, COLORS } from '../config/index';
import type { RalphExecutionBackendId } from '../utils/ralph-execution-backend';
import { DEFAULT_RALPH_RUNNER } from '../utils/ralph-execution-backend';
import { ralphDebugLogger } from '../utils/ralph-debug-logger';

/** Chunk from runner stdout or stderr when using async spawn. */
export interface CursorAgentChunk {
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
}

export interface RunIterationConfig {
  /** Full prompt for the runner (e.g. Cursor `-p`); includes injected plan/tasks and Plan-Id (and optional Task-Id). */
  agentPrompt: string;
  /** @description Execution backend; defaults to {@link DEFAULT_RALPH_RUNNER}. */
  backend?: RalphExecutionBackendId;
  /** Iteration number. */
  iteration: number;
  /** Model preset when the backend supports it (Cursor: `--model`). */
  model?: string;
  /** Optional per-iteration timeout in ms (async path only). On expiry, child is killed (SIGTERM then SIGKILL). */
  timeoutMs?: number;
  /** Optional AbortSignal to cancel the iteration (async path only). */
  signal?: AbortSignal;
  /** Optional callback for each stdout/stderr chunk (async path only). */
  onChunk?: (chunk: CursorAgentChunk) => void;
}

/** Grace period in ms after SIGTERM before sending SIGKILL (runner child). */
const SIGKILL_GRACE_MS = 10_000;

const backendIterationLabel = (backend: RalphExecutionBackendId): string => {
  switch (backend) {
    case 'cursor':
      return 'cursor-agent';
    default: {
      const _exhaustive: never = backend;
      return _exhaustive;
    }
  }
};

/**
 * @description Escapes a string for safe use inside a double-quoted shell argument.
 * Prevents plan/task text containing " or \ from breaking the shell command.
 */
function escapeForShellDoubleQuoted(prompt: string): string {
  return prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @description Cursor backend: one sync iteration (`cursor-agent --force -p …`).
 */
const runCursorIterationSync = (config: RunIterationConfig): string => {
  const { agentPrompt, iteration, model } = config;
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
 * @description Executes a single iteration of the agentic process (sync). Use when running interactively (TTY).
 */
export const runIteration = (config: RunIterationConfig): string => {
  const { backend = DEFAULT_RALPH_RUNNER, iteration } = config;
  const message = `🤖 Running iteration ${COLORS.green}${iteration}${COLORS.reset}\n`;

  console.log(`\n${ARTWORK_LINE}\n`);
  console.log(message);

  switch (backend) {
    case 'cursor':
      return runCursorIterationSync(config);
    default: {
      const _exhaustive: never = backend;
      throw new Error(`Unsupported execution backend: ${_exhaustive}`);
    }
  }
};

/**
 * @description Cursor backend: one async iteration with streaming and timeout.
 * On timeout or abort, kills child with SIGTERM then SIGKILL after grace; returns a string that triggers hasError so the CLI exits(1).
 */
const runCursorIterationAsync = (
  config: RunIterationConfig,
): Promise<string> => {
  const { agentPrompt, iteration, model, timeoutMs, signal, onChunk } = config;
  const modelFlag = model ? ` --model ${model}` : '';
  const safePrompt = escapeForShellDoubleQuoted(agentPrompt);
  const command = `cursor-agent --force -p "${safePrompt}"${modelFlag}`;
  const runnerLabel = backendIterationLabel('cursor');

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
        try {
          child.kill('SIGKILL');
        } catch {
          /* process may have exited */
        }
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
          `<promise>ERROR</promise>\n${runnerLabel} iteration timed out after ${timeoutMs}ms`,
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
          `<promise>ERROR</promise>\n${runnerLabel} iteration was cancelled`,
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

/**
 * @description Executes a single iteration using spawn + Promise. Use when non-interactive for streaming and per-iteration timeout/cancel.
 */
export const runIterationAsync = (
  config: RunIterationConfig,
): Promise<string> => {
  const { backend = DEFAULT_RALPH_RUNNER, iteration } = config;
  const message = `🤖 Running iteration ${COLORS.green}${iteration}${COLORS.reset}\n`;

  console.log(`\n${ARTWORK_LINE}\n`);
  console.log(message);

  switch (backend) {
    case 'cursor':
      return runCursorIterationAsync(config);
    default: {
      const _exhaustive: never = backend;
      return Promise.reject(
        new Error(`Unsupported execution backend: ${_exhaustive}`),
      );
    }
  }
};
