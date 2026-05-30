/**
 * Child job: run the Ralph loop in a worktree, commit per task (agent responsibility),
 * complete the plan when all tasks are done, and return branch name and commit SHA for the parent.
 */

import { spawn, spawnSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import { buildWorkflowRalphSpawnEnv } from '@openthrottle/ai-mcp/src/cortex-server';
import type { ChildProcessMetrics } from '../types/child-process-metrics';
import type { WallClockMetrics } from '../types/wall-clock-metrics';
import { createWallClockMetrics } from '../types/wall-clock-metrics';
import type {
  ChildJobInput,
  ChildJobResult,
  ChildJobStreamChunk,
} from '../types/worktree';
import type { WorkflowRalphConfig } from './cortex-ralph';
import {
  appendPlanOutput,
  ensureCortexReachable,
  getTasksByPlanId,
  RALPH_FATAL_REQUIRED_GRAPHQL,
  RALPH_FATAL_REQUIRED_POSTGRES,
  resolveWorkflowRalphConfig,
  updatePlanStatus,
} from './cortex-ralph';
import { resolveWorkflowRalphTransportFromEnv } from './workflow-transport';
import { ralphDebugLogger } from './ralph-debug-logger';
import { resolveRalphWorktreeName } from './ralph-worktree-cli';
import {
  buildWorkflowRalphRunTuningArgv,
  normalizeRalphNestedDebugCli,
} from './workflow-ralph-nested-argv';
import { createChildProcessMetricsCollector } from './child-process-metrics';
import type { ChildProcessMetricsCollector } from './child-process-metrics';

/** Microseconds per millisecond for CPU time conversion. */
const MICROSECONDS_PER_MS = 1000;

/** Grace period in ms after SIGTERM before sending SIGKILL. */
const SIGKILL_GRACE_MS = 10_000;

interface RalphSpawnResult {
  readonly killReason?: 'timeout' | 'abort';
  readonly pid: number | undefined;
  readonly signal: NodeJS.Signals | null;
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

/**
 * @description Runs the Ralph process with spawn + Promise. Supports timeout, AbortSignal, and optional onChunk.
 * On timeout or abort, kills child with SIGTERM then SIGKILL after grace period.
 * Returns the child PID so callers can poll metrics.
 */
function runRalphAsync(
  worktreePath: string,
  ralphArgs: string[],
  options: {
    readonly canonicalCortexPostgresUrl?: string;
    readonly metricsCollector?: ChildProcessMetricsCollector;
    readonly onChunk?: (chunk: ChildJobStreamChunk) => void;
    readonly signal?: AbortSignal;
    readonly timeoutMs?: number;
  },
): Promise<RalphSpawnResult> {
  return new Promise((resolve, reject) => {
    ralphDebugLogger.debug('runRalphAsync: spawn workflow-ralph', {
      cwd: worktreePath,
      ralphArgs,
    });

    const child: ChildProcess = spawn('pnpm', ralphArgs, {
      cwd: worktreePath,
      env: buildWorkflowRalphSpawnEnv(process.env, {
        canonicalCortexPostgresUrl: options.canonicalCortexPostgresUrl,
      }),
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    const childPid = child.pid;

    if (childPid !== undefined && options.metricsCollector) {
      options.metricsCollector.start(childPid);
    }

    let stdout = '';
    let stderr = '';
    let killReason: 'timeout' | 'abort' | undefined;
    let resolved = false;
    let chunkCount = 0;

    const push = (stream: 'stdout' | 'stderr', data: string): void => {
      if (stream === 'stdout') stdout += data;
      else stderr += data;
      chunkCount += 1;
      ralphDebugLogger.verbose('runRalphAsync: chunk', {
        chunkIndex: chunkCount,
        chunkLen: data.length,
        stderrLen: stderr.length,
        stdoutLen: stdout.length,
        stream,
      });
      options.onChunk?.({ data, stream });
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
        // After SIGTERM, Node sets `killed` to true; still send SIGKILL if the child has not exited.
        try {
          child.kill('SIGKILL');
        } catch {
          /* process may have exited */
        }
      }, SIGKILL_GRACE_MS);

      child.once('close', () => clearTimeout(killTimeout));
    };

    const onAbort = (): void => {
      if (options.signal?.aborted) killChild('abort');
    };

    const done = (
      status: number | null,
      signal: NodeJS.Signals | null,
    ): void => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', onAbort);
      ralphDebugLogger.debug('runRalphAsync: child closed', {
        chunkCount,
        killReason: killReason ?? null,
        pid: childPid ?? null,
        signal: signal ?? null,
        status,
        stderrLen: stderr.length,
        stdoutLen: stdout.length,
      });
      resolve({
        killReason,
        pid: childPid,
        signal,
        status,
        stderr,
        stdout,
      });
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (options.timeoutMs !== undefined && options.timeoutMs > 0) {
      timeoutId = setTimeout(() => killChild('timeout'), options.timeoutMs);
    }

    options.signal?.addEventListener('abort', onAbort);
    if (options.signal?.aborted) {
      killChild('abort');
    }

    child.on('close', (code, sig) => done(code ?? null, sig ?? null));
    child.on('error', (err) => {
      ralphDebugLogger.debug('runRalphAsync: child process error', {
        chunkCount,
        err,
        stderrLen: stderr.length,
        stdoutLen: stdout.length,
      });

      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        options.signal?.removeEventListener('abort', onAbort);
        reject(err);
      }
    });
  });
}

/**
 * @description Runs git in the worktree and returns stdout trimmed, or undefined on failure.
 */
function gitInWorktree(
  worktreePath: string,
  args: string[],
): string | undefined {
  const child = spawnSync('git', ['-C', worktreePath, ...args], {
    encoding: 'utf-8',
  });
  if (child.status !== 0) return undefined;

  return child.stdout?.trim();
}

/**
 * @description Computes wall-clock metrics from start/end timestamps and CPU usage.
 */
function computeWallClockMetrics(
  startTimestamp: number,
  endTimestamp: number,
  cpuAtStart: NodeJS.CpuUsage,
  cpuAtEnd: NodeJS.CpuUsage,
): WallClockMetrics {
  const cpuUserDeltaMs =
    (cpuAtEnd.user - cpuAtStart.user) / MICROSECONDS_PER_MS;
  const cpuSystemDeltaMs =
    (cpuAtEnd.system - cpuAtStart.system) / MICROSECONDS_PER_MS;

  return createWallClockMetrics({
    cpuSystemDeltaMs,
    cpuUserDeltaMs,
    endTimestamp,
    startTimestamp,
  });
}

/**
 * @description Runs the Ralph loop in the worktree (spawns workflow-ralph with cwd = worktree path),
 * then reads branch and HEAD commit SHA, and marks the plan COMPLETED if all tasks are done.
 * Returns branch name and commit SHA for the parent job to validate before releasing the target.
 * Supports optional timeoutMs, AbortSignal, onChunk for streaming, child process metrics polling,
 * and wall-clock vs CPU time metrics.
 */
export async function runChildJob(
  input: ChildJobInput,
): Promise<ChildJobResult> {
  const {
    backend,
    canonicalCortexPostgresUrl,
    handoff,
    iterationTimeoutSeconds,
    iterations,
    model,
    planId,
    project,
    prompt,
    promptFile,
    ralphDebugCli,
    timeoutMs,
    signal,
    onChunk,
    streamToCortex,
    streamIteration,
    childProcessMetrics: metricsOption,
    skipWorktreeSetup,
    worktree,
    worktreeBase,
  } = input;
  const { targetId, worktreePath } = handoff;

  const startTimestamp = Date.now();
  const cpuAtStart = process.cpuUsage();

  const trimmedCanonical = canonicalCortexPostgresUrl?.trim();
  let config: WorkflowRalphConfig | null = resolveWorkflowRalphConfig();

  if (config == null) {
    const endTimestamp = Date.now();
    const cpuAtEnd = process.cpuUsage();
    const transport = resolveWorkflowRalphTransportFromEnv();
    const reason =
      transport === 'postgres-direct'
        ? RALPH_FATAL_REQUIRED_POSTGRES.trim()
        : RALPH_FATAL_REQUIRED_GRAPHQL.trim();

    return {
      ok: false,
      reason,
      wallClockMetrics: computeWallClockMetrics(
        startTimestamp,
        endTimestamp,
        cpuAtStart,
        cpuAtEnd,
      ),
    };
  }

  if (
    config.transport === 'postgres-direct' &&
    trimmedCanonical &&
    trimmedCanonical !== ''
  ) {
    config = {
      connectionString: trimmedCanonical,
      transport: 'postgres-direct',
    };
  }
  try {
    await ensureCortexReachable(config);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const endTimestamp = Date.now();
    const cpuAtEnd = process.cpuUsage();
    return {
      ok: false,
      reason: `Cortex unreachable: ${msg}`,
      wallClockMetrics: computeWallClockMetrics(
        startTimestamp,
        endTimestamp,
        cpuAtStart,
        cpuAtEnd,
      ),
    };
  }

  const ralphArgs = [
    'exec',
    'workflow-ralph',
    '--plan',
    planId,
    ...buildWorkflowRalphRunTuningArgv({
      backend,
      debug: normalizeRalphNestedDebugCli(ralphDebugCli),
      iterationTimeoutSeconds,
      iterations,
      model,
      project,
      prompt,
      promptFile,
      skipWorktreeSetup,
      worktree: resolveRalphWorktreeName({
        cli: worktree,
        handoffTargetId: targetId,
      }),
      worktreeBase,
    }),
  ];

  const effectiveOnChunk: ((chunk: ChildJobStreamChunk) => void) | undefined =
    streamToCortex || onChunk
      ? (chunk): void => {
          onChunk?.(chunk);
          if (streamToCortex && config) {
            const prefix =
              chunk.stream === 'stdout' ? '[stdout] ' : '[stderr] ';
            appendPlanOutput(
              config,
              planId,
              prefix + chunk.data,
              streamIteration ?? undefined,
            ).catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              console.error(
                `[child-job] streamToCortex append_plan_output failed: ${msg}`,
              );
            });
          }
        }
      : undefined;

  const metricsCollector =
    metricsOption === false
      ? undefined
      : createChildProcessMetricsCollector(
          typeof metricsOption === 'object' ? metricsOption : undefined,
        );

  const ralph = await runRalphAsync(worktreePath, ralphArgs, {
    canonicalCortexPostgresUrl: trimmedCanonical,
    metricsCollector,
    onChunk: effectiveOnChunk,
    signal,
    timeoutMs,
  });

  const endTimestamp = Date.now();
  const cpuAtEnd = process.cpuUsage();
  const wallClockMetrics = computeWallClockMetrics(
    startTimestamp,
    endTimestamp,
    cpuAtStart,
    cpuAtEnd,
  );

  const childMetrics: ChildProcessMetrics | undefined =
    metricsCollector?.stop() ?? undefined;

  const stderrTrimmed = ralph.stderr.trim();
  if (ralph.killReason === 'timeout') {
    return {
      childProcessMetrics: childMetrics,
      ok: false,
      reason: 'Ralph run timed out',
      stderr: stderrTrimmed || undefined,
      wallClockMetrics,
    };
  }

  if (ralph.killReason === 'abort') {
    return {
      childProcessMetrics: childMetrics,
      ok: false,
      reason: 'Ralph run was cancelled',
      stderr: stderrTrimmed || undefined,
      wallClockMetrics,
    };
  }

  if (ralph.status !== 0) {
    return {
      childProcessMetrics: childMetrics,
      ok: false,
      reason: `Ralph exited with code ${ralph.status ?? 'unknown'}`,
      stderr: stderrTrimmed || undefined,
      wallClockMetrics,
    };
  }

  const branchName = gitInWorktree(worktreePath, [
    'rev-parse',
    '--abbrev-ref',
    'HEAD',
  ]);
  const commitSha = gitInWorktree(worktreePath, ['rev-parse', 'HEAD']);

  if (!branchName || !commitSha) {
    return {
      childProcessMetrics: childMetrics,
      ok: false,
      reason: 'Could not read branch or HEAD commit from worktree',
      stderr: stderrTrimmed || undefined,
      wallClockMetrics,
    };
  }

  const tasks = await getTasksByPlanId(config, planId);
  const allDone =
    tasks.length > 0 &&
    tasks.every((t) => t.status === 'COMPLETED' || t.status === 'SKIPPED');
  if (allDone) {
    await updatePlanStatus(config, planId, 'COMPLETED');
  }

  return {
    branchName,
    childProcessMetrics: childMetrics,
    commitSha,
    ok: true,
    planCompleted: allDone,
    wallClockMetrics,
  };
}
