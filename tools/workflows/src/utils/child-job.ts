/**
 * Child job: run the Ralph loop in a worktree, commit per task (agent responsibility),
 * complete the plan when all tasks are done, and return branch name and commit SHA for the parent.
 */

import { spawn, spawnSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import { buildNestedWorkflowRalphSpawnEnv } from '../config/build-nested-workflow-ralph-spawn-env.ts';
import type { ChildProcessMetrics } from '../types/child-process-metrics';
import type { WallClockMetrics } from '../types/wall-clock-metrics';
import { createWallClockMetrics } from '../types/wall-clock-metrics';
import type {
  ChildJobInput,
  ChildJobResult,
  ChildJobStreamChunk,
} from '../types/worktree';
import type { WorkflowRalphConfig } from './openthrottle-ralph';
import {
  appendPlanOutput,
  ensureCortexReachable,
  RALPH_FATAL_REQUIRED_GRAPHQL,
  RALPH_FATAL_REQUIRED_POSTGRES,
  reconcilePlanCompletionIfAllTasksTerminal,
  resolveWorkflowRalphConfig,
} from './openthrottle-ralph';
import { resolveWorkflowRalphTransport } from '../config/load-workflow-ralph-config.ts';
import { escalateKill } from './child-kill';
import { createPlanOutputStreamer } from './plan-output-streamer';
import { ralphDebugLogger } from './ralph-debug-logger';
import { resolveRalphWorktreeName } from './ralph-worktree-cli';
import { buildWorkflowRalphRunTuningArgv } from './workflow-ralph-nested-argv';
import { createChildProcessMetricsCollector } from './child-process-metrics';
import type { ChildProcessMetricsCollector } from './child-process-metrics';

/** Microseconds per millisecond for CPU time conversion. */
const MICROSECONDS_PER_MS = 1000;

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
    readonly canonicalPostgresUrl?: string;
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
      env: buildNestedWorkflowRalphSpawnEnv(worktreePath, process.env, {
        canonicalPostgresUrl: options.canonicalPostgresUrl,
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

      escalateKill(child);
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
    canonicalPostgresUrl,
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

  const trimmedCanonical = canonicalPostgresUrl?.trim();
  let config: WorkflowRalphConfig | null = resolveWorkflowRalphConfig();

  if (config == null) {
    const endTimestamp = Date.now();
    const cpuAtEnd = process.cpuUsage();
    const transport = resolveWorkflowRalphTransport(worktreePath);
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
      debug: ralphDebugCli,
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

  // Serialize plan-output appends so chunks land in order, retry transient append
  // failures, and track ultimate losses (see plan-output-streamer). Previously these
  // were fire-and-forget and unordered, so output could land out of order or vanish
  // silently on a transient GraphQL/network error.
  const streamConfig = streamToCortex ? config : undefined;
  const planOutputStreamer = streamConfig
    ? createPlanOutputStreamer({
        append: (content) =>
          appendPlanOutput(
            streamConfig,
            planId,
            content,
            streamIteration ?? undefined,
          ),
      })
    : undefined;

  const effectiveOnChunk: ((chunk: ChildJobStreamChunk) => void) | undefined =
    streamToCortex || onChunk
      ? (chunk): void => {
          onChunk?.(chunk);
          if (planOutputStreamer) {
            const prefix =
              chunk.stream === 'stdout' ? '[stdout] ' : '[stderr] ';
            planOutputStreamer.enqueue(prefix + chunk.data);
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
    canonicalPostgresUrl: trimmedCanonical,
    metricsCollector,
    onChunk: effectiveOnChunk,
    signal,
    timeoutMs,
  });

  // Drain queued appends before returning so no plan output is dropped on the floor
  // when the child process exits, and so the summary reflects every chunk.
  const planOutputStreamSummary = planOutputStreamer
    ? await planOutputStreamer.drain()
    : undefined;

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

  const planCompleted = await reconcilePlanCompletionIfAllTasksTerminal(
    config,
    planId,
  );

  return {
    branchName,
    childProcessMetrics: childMetrics,
    commitSha,
    ok: true,
    planCompleted,
    wallClockMetrics,
    ...(planOutputStreamSummary && planOutputStreamSummary.failed > 0
      ? {
          planOutputStreamFailureReason:
            planOutputStreamSummary.firstFailureMessage,
          planOutputStreamFailures: planOutputStreamSummary.failed,
        }
      : {}),
  };
}
