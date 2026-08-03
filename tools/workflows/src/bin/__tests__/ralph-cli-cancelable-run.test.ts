/**
 * @description Tests for the detached-CLI cancelable-run wiring in bin/ralph.ts: register on start,
 * poll the durable cancel marker, escalateKill the in-flight child (via AbortController.signal), and
 * settle the run row on every terminal path. The facade helpers are mocked, so the same wiring is
 * exercised for both transports (graphql / postgres-direct) — the transport branch itself is covered
 * by the transport-level tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PlanRow,
  TaskRow,
  WorkflowRalphConfig,
} from '../../utils/openthrottle-ralph';

const PLAN_ID = '970aecc7-c647-4948-aa20-410e1bd090fc';
const TASK_ID = '9e4453e3-8b98-4df2-8cc5-d06afed67222';
const RUN_ID = 'cli-run-1';
/** Must match CLI_CANCEL_POLL_INTERVAL_MS in ralph.ts. */
const POLL_MS = 3000;
/** Must match HEARTBEAT_INTERVAL_MS in openthrottle-ralph.ts. */
const HEARTBEAT_MS = 15_000;

const graphqlConfig: WorkflowRalphConfig = { transport: 'graphql' };
const postgresConfig: WorkflowRalphConfig = {
  connectionString: 'postgres://localhost/openthrottle',
  transport: 'postgres-direct',
};

const mockPlan: PlanRow = {
  author: 'test',
  category: 'test',
  createdAt: new Date().toISOString(),
  description: null,
  id: PLAN_ID,
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: new Date().toISOString(),
};

const pendingTask: TaskRow = {
  category: null,
  createdAt: new Date().toISOString(),
  description: null,
  id: TASK_ID,
  planId: PLAN_ID,
  requirements: [],
  sortOrder: 1000,
  status: 'PENDING',
  title: 'Do the thing',
  updatedAt: new Date().toISOString(),
};

const {
  bumpCliPlanRunHeartbeatMock,
  captureRunLocationMock,
  getOpenThrottleConfigOrExitMock,
  readPlanRunCancelMarkerMock,
  registerCliPlanRunMock,
  resolveGitBranchFromCwdMock,
  runIterationAsyncMock,
  settleCliPlanRunMock,
  updatePlanStatusMock,
  updateTaskStatusMock,
} = vi.hoisted(() => ({
  bumpCliPlanRunHeartbeatMock: vi.fn().mockResolvedValue(undefined),
  captureRunLocationMock: vi.fn(() => ({
    hostname: 'laptop-1',
    pid: 4242,
    workerId: null,
  })),
  getOpenThrottleConfigOrExitMock: vi.fn(),
  readPlanRunCancelMarkerMock: vi.fn().mockResolvedValue(null),
  registerCliPlanRunMock: vi.fn().mockResolvedValue('cli-run-1'),
  resolveGitBranchFromCwdMock: vi.fn(() => null),
  runIterationAsyncMock: vi.fn().mockResolvedValue('agent output'),
  settleCliPlanRunMock: vi.fn().mockResolvedValue(undefined),
  updatePlanStatusMock: vi.fn().mockResolvedValue(undefined),
  updateTaskStatusMock: vi
    .fn()
    .mockResolvedValue({ id: '9e4453e3-8b98-4df2-8cc5-d06afed67222' }),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();
  return {
    ...actual,
    resolveGitBranchFromCwd: resolveGitBranchFromCwdMock,
  };
});

vi.mock('../../utils/openthrottle-ralph', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../utils/openthrottle-ralph')>();
  return {
    ...actual,
    bumpCliPlanRunHeartbeat: bumpCliPlanRunHeartbeatMock,
    captureRunLocation: captureRunLocationMock,
    ensureDatabaseReachableOrExit: vi.fn().mockResolvedValue(undefined),
    getOpenThrottleConfigOrExit: getOpenThrottleConfigOrExitMock,
    getPlanById: vi.fn().mockResolvedValue(mockPlan),
    getTasksByPlanId: vi.fn().mockResolvedValue([pendingTask]),
    readPlanRunCancelMarker: readPlanRunCancelMarkerMock,
    reconcilePlanCompletionIfAllTasksTerminal: vi.fn().mockResolvedValue(false),
    registerCliPlanRun: registerCliPlanRunMock,
    settleCliPlanRun: settleCliPlanRunMock,
    updatePlanStatus: updatePlanStatusMock,
    updateTaskStatus: updateTaskStatusMock,
  };
});

vi.mock('../../utils/parsers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/parsers')>();
  return {
    ...actual,
    parseRalphArgs: vi.fn(() => ({
      backend: 'claude',
      iterationTimeoutMs: undefined,
      iterations: 1,
      model: 'auto',
      plan: PLAN_ID,
      project: undefined,
      prompt: '/agents/ralph',
      promptProfileKind: 'named',
      promptProfileLabel: '/agents/ralph',
      ralphDebugLevel: 'off',
      task: undefined,
    })),
  };
});

vi.mock('../../utils/projects', () => ({
  getNxProjectNames: vi.fn().mockResolvedValue([]),
}));

vi.mock('../run-iteration', () => ({
  runIteration: vi.fn().mockReturnValue('agent output'),
  runIterationAsync: runIterationAsyncMock,
}));

/** process.exit stub that throws so control flow stops at the exit point, as in production. */
const EXIT = 'process.exit-called';
function throwingExit(): never {
  throw new Error(EXIT);
}

/** Adapts a no-op impl to `process.exit`'s `never` return type without a cast. */
function toProcessExit(impl: () => void): typeof process.exit;
function toProcessExit(impl: () => void): unknown {
  return impl;
}

describe('Ralph detached-CLI cancelable run', () => {
  const originalIsTTY = process.stdin.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Detached / non-TTY: the tracked-run path (isTTY !== true).
    process.stdin.isTTY = false;
    getOpenThrottleConfigOrExitMock.mockReturnValue(graphqlConfig);
    readPlanRunCancelMarkerMock.mockResolvedValue(null);
    registerCliPlanRunMock.mockResolvedValue(RUN_ID);
    runIterationAsyncMock.mockResolvedValue('agent output');
    settleCliPlanRunMock.mockClear();
    updatePlanStatusMock.mockClear();
    updateTaskStatusMock.mockClear();
    registerCliPlanRunMock.mockClear();
    resolveGitBranchFromCwdMock.mockClear();
    resolveGitBranchFromCwdMock.mockReturnValue(null);
    bumpCliPlanRunHeartbeatMock.mockClear();
    bumpCliPlanRunHeartbeatMock.mockResolvedValue(undefined);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(throwingExit);
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTTY;
    exitSpy.mockRestore();
    vi.useRealTimers();
    vi.resetModules();
    // Handlers registered by detached runs persist (process.once fires only on the
    // signal); clear them so they never leak into a later test.
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('beforeExit');
  });

  /** Flush the microtask + macrotask queue so an in-flight async main() reaches registration. */
  const flush = async (): Promise<void> => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };

  it('registers a run on start and settles COMPLETED on the normal exit', async () => {
    const { main } = await import('../ralph.js');

    await expect(main()).rejects.toThrow(EXIT);

    expect(registerCliPlanRunMock).toHaveBeenCalledWith(graphqlConfig, {
      executionBackend: 'claude',
      location: { hostname: 'laptop-1', pid: 4242, workerId: null },
      planId: PLAN_ID,
    });
    expect(settleCliPlanRunMock).toHaveBeenCalledWith(
      graphqlConfig,
      RUN_ID,
      'COMPLETED',
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('passes branch into registerCliPlanRun when resolveGitBranchFromCwd returns a name', async () => {
    resolveGitBranchFromCwdMock.mockReturnValue('feature/cli-branch');
    const { main } = await import('../ralph.js');

    await expect(main()).rejects.toThrow(EXIT);

    expect(registerCliPlanRunMock).toHaveBeenCalledWith(graphqlConfig, {
      branch: 'feature/cli-branch',
      executionBackend: 'claude',
      location: { hostname: 'laptop-1', pid: 4242, workerId: null },
      planId: PLAN_ID,
    });
  });

  it('omits branch when resolveGitBranchFromCwd returns null (silent)', async () => {
    resolveGitBranchFromCwdMock.mockReturnValue(null);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { main } = await import('../ralph.js');

    await expect(main()).rejects.toThrow(EXIT);

    expect(registerCliPlanRunMock).toHaveBeenCalledWith(
      graphqlConfig,
      expect.not.objectContaining({ branch: expect.anything() }),
    );
    expect(
      warnSpy.mock.calls.some((c) =>
        String(c[0]).toLowerCase().includes('branch'),
      ),
    ).toBe(false);
    warnSpy.mockRestore();
  });

  it('continues UN-TRACKED when register fails (no settle, real work not aborted)', async () => {
    registerCliPlanRunMock.mockRejectedValueOnce(new Error('server down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { main } = await import('../ralph.js');

    await expect(main()).rejects.toThrow(EXIT);

    // Ran the iteration despite register failure.
    expect(runIterationAsyncMock).toHaveBeenCalled();
    // Never settled (planRunId null → untracked, today's NO_ACTIVE_RUN behavior).
    expect(settleCliPlanRunMock).not.toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some((c) => String(c[0]).includes('UN-TRACKED')),
    ).toBe(true);
    warnSpy.mockRestore();
  });

  it('settles FAILED and rethrows when the iteration throws', async () => {
    runIterationAsyncMock.mockRejectedValueOnce(new Error('agent crashed'));
    const { main } = await import('../ralph.js');

    await expect(main()).rejects.toThrow('agent crashed');

    expect(settleCliPlanRunMock).toHaveBeenCalledWith(
      graphqlConfig,
      RUN_ID,
      'FAILED',
    );
  });

  it('does NOT register or settle on a TTY (interactive) run', async () => {
    process.stdin.isTTY = true;
    const { main } = await import('../ralph.js');

    await expect(main()).rejects.toThrow(EXIT);

    expect(registerCliPlanRunMock).not.toHaveBeenCalled();
    expect(settleCliPlanRunMock).not.toHaveBeenCalled();
  });

  it('aborts the in-flight child mid-iteration when the marker is set, settles CANCELLED, resets task + plan to PENDING', async () => {
    vi.useFakeTimers();
    // The iteration resolves only once its AbortSignal fires — proves the child is killed mid-run.
    runIterationAsyncMock.mockImplementation(
      (cfg: { signal?: AbortSignal }) =>
        new Promise<string>((resolve) => {
          cfg.signal?.addEventListener('abort', () =>
            resolve('partial output'),
          );
        }),
    );
    readPlanRunCancelMarkerMock.mockResolvedValue({
      cancelRequestedAt: '2026-07-22T00:05:00.000Z',
      planRunId: RUN_ID,
      status: 'IN_PROGRESS',
    });

    const { main } = await import('../ralph.js');
    const run = main().catch((error: unknown) => error);

    // Fire the poll → reads marker → abort() → iteration resolves → finishKilledRun.
    await vi.advanceTimersByTimeAsync(POLL_MS + 50);
    const outcome = await run;

    expect(outcome).toBeInstanceOf(Error);
    if (outcome instanceof Error) {
      expect(outcome.message).toBe(EXIT);
    }
    expect(settleCliPlanRunMock).toHaveBeenCalledWith(
      graphqlConfig,
      RUN_ID,
      'CANCELLED',
    );
    // Re-runnable: in-flight task + plan reset to PENDING.
    expect(updateTaskStatusMock).toHaveBeenCalledWith(
      graphqlConfig,
      TASK_ID,
      'PENDING',
    );
    expect(updatePlanStatusMock).toHaveBeenCalledWith(
      graphqlConfig,
      PLAN_ID,
      'PENDING',
    );
    // Never marked the task COMPLETED on a kill.
    expect(
      updateTaskStatusMock.mock.calls.some((c) => c[2] === 'COMPLETED'),
    ).toBe(false);
  });

  it('stops when another run supersedes this one (newest run id != my run id)', async () => {
    vi.useFakeTimers();
    runIterationAsyncMock.mockImplementation(
      (cfg: { signal?: AbortSignal }) =>
        new Promise<string>((resolve) => {
          cfg.signal?.addEventListener('abort', () =>
            resolve('partial output'),
          );
        }),
    );
    // Marker NOT set, but the newest run row is a different run → superseded.
    readPlanRunCancelMarkerMock.mockResolvedValue({
      cancelRequestedAt: null,
      planRunId: 'a-newer-run',
      status: 'IN_PROGRESS',
    });

    const { main } = await import('../ralph.js');
    const run = main().catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(POLL_MS + 50);
    await run;

    expect(settleCliPlanRunMock).toHaveBeenCalledWith(
      graphqlConfig,
      RUN_ID,
      'CANCELLED',
    );
  });

  it('best-effort settles CANCELLED on SIGTERM (postgres-direct transport)', async () => {
    getOpenThrottleConfigOrExitMock.mockReturnValue(postgresConfig);
    // A non-resolving iteration keeps the run in-flight while the signal fires.
    runIterationAsyncMock.mockImplementation(
      () => new Promise<string>(() => {}),
    );
    // SIGTERM handler calls process.exit; use a noop so the handler completes cleanly.
    exitSpy.mockImplementation(toProcessExit(() => {}));

    const { main } = await import('../ralph.js');
    void main();

    // Let registration + signal-handler setup complete before signaling.
    await flush();
    expect(registerCliPlanRunMock).toHaveBeenCalled();

    process.emit('SIGTERM');
    // Flush the handler's async best-effort settle.
    await flush();

    expect(settleCliPlanRunMock).toHaveBeenCalledWith(
      postgresConfig,
      RUN_ID,
      'CANCELLED',
    );
  });

  it('bumps the liveness heartbeat on the interval while the run is in flight', async () => {
    vi.useFakeTimers();
    // Keep the run in flight so the heartbeat timer has time to fire.
    runIterationAsyncMock.mockImplementation(
      () => new Promise<string>(() => {}),
    );

    const { main } = await import('../ralph.js');
    void main().catch(() => {});

    // Let registration complete, then advance past two heartbeat intervals.
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2 + 50);

    expect(bumpCliPlanRunHeartbeatMock).toHaveBeenCalledWith(
      graphqlConfig,
      RUN_ID,
    );
    expect(
      bumpCliPlanRunHeartbeatMock.mock.calls.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('does NOT start the heartbeat when register fails (untracked run)', async () => {
    registerCliPlanRunMock.mockRejectedValueOnce(new Error('server down'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();

    const { main } = await import('../ralph.js');
    void main().catch(() => {});

    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2 + 50);

    expect(bumpCliPlanRunHeartbeatMock).not.toHaveBeenCalled();
  });

  it('warns and continues when a heartbeat bump fails (never aborts the run)', async () => {
    vi.useFakeTimers();
    bumpCliPlanRunHeartbeatMock.mockRejectedValue(new Error('bump failed'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    runIterationAsyncMock.mockImplementation(
      () => new Promise<string>(() => {}),
    );

    const { main } = await import('../ralph.js');
    void main().catch(() => {});

    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS + 50);

    expect(bumpCliPlanRunHeartbeatMock).toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some((c) => String(c[0]).includes('Heartbeat bump')),
    ).toBe(true);
    // The run was never aborted or settled by the heartbeat failure.
    expect(settleCliPlanRunMock).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
