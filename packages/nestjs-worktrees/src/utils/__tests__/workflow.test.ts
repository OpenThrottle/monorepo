/**
 * @description Tests for runWorktreeWorkflow: acquire → run loop → ensure commit → push → release,
 * with the target always released when acquire succeeded (even when the loop throws or fails).
 * parent-job's acquire/ensure-commit/push helpers are mocked so no real git/tracker I/O happens.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AcquireResult,
  IWorktreeTargetsTracker,
  ParentJobAcquireResult,
  ParentJobEnsureCommitResult,
  ParentJobHandoff,
  PushBranchResult,
  ReleaseResult,
  WorkflowLoopResult,
  WorktreeTarget,
  WorktreeTargetAvailable,
  WorktreeWorkflowOptions,
} from '../../types/worktree';

const mockState: {
  acquireResult: ParentJobAcquireResult;
  ensureCommitResult: ParentJobEnsureCommitResult;
  pushResult: PushBranchResult;
} = {
  acquireResult: {
    handoff: {
      branchName: 'ralph/feature-a1b2c3',
      targetId: 'target-1',
      worktreePath: '/tmp/worktree-1',
    },
    ok: true,
  },
  ensureCommitResult: { ok: true },
  pushResult: { ok: true },
};

vi.mock('../parent-job', () => ({
  parentJobAcquireAndCreateBranch: vi.fn(
    async (): Promise<ParentJobAcquireResult> => mockState.acquireResult,
  ),
  parentJobEnsureCommitBeforeRelease: vi.fn(
    (): ParentJobEnsureCommitResult => mockState.ensureCommitResult,
  ),
  pushBranchToRemote: vi.fn((): PushBranchResult => mockState.pushResult),
}));

const HANDOFF: ParentJobHandoff = {
  branchName: 'ralph/feature-a1b2c3',
  targetId: 'target-1',
  worktreePath: '/tmp/worktree-1',
};

function createFakeTracker(
  releaseResult: ReleaseResult = { ok: true },
): IWorktreeTargetsTracker & { readonly releaseCalls: number } {
  const available: WorktreeTargetAvailable = {
    id: 'target-1',
    path: '/tmp/worktree-1',
    status: 'available',
  };
  let releaseCalls = 0;

  return {
    acquire: (): AcquireResult => ({
      ok: true,
      target: {
        id: 'target-1',
        lockedBy: 'job-1',
        path: '/tmp/worktree-1',
        status: 'locked',
      },
    }),
    getAvailableTarget: (): WorktreeTargetAvailable | undefined => available,
    hasAvailableTarget: (): boolean => true,
    listTargets: (): readonly WorktreeTarget[] => [available],
    release: (): ReleaseResult => {
      releaseCalls += 1;
      return releaseResult;
    },
    get releaseCalls() {
      return releaseCalls;
    },
  };
}

describe('runWorktreeWorkflow', () => {
  beforeEach(() => {
    mockState.acquireResult = { handoff: HANDOFF, ok: true };
    mockState.ensureCommitResult = { ok: true };
    mockState.pushResult = { ok: true };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns released: false without running the loop when acquire fails', async () => {
    mockState.acquireResult = { ok: false, reason: 'acquire_failed' };
    const tracker = createFakeTracker();
    const runLoop = vi.fn(async (): Promise<WorkflowLoopResult> => ({
      ok: true,
    }));
    const { runWorktreeWorkflow } = await import('../workflow');
    const options: WorktreeWorkflowOptions = {
      acquire: { lockedBy: 'job-1' },
      runLoop,
      tracker,
    };

    const result = await runWorktreeWorkflow(options);

    expect(result).toEqual({
      acquire: { ok: false, reason: 'acquire_failed' },
      released: false,
    });
    expect(runLoop).not.toHaveBeenCalled();
    expect(tracker.releaseCalls).toBe(0);
  });

  it('runs ensure-commit and push, then releases on loop success', async () => {
    const tracker = createFakeTracker();
    const runLoop = vi.fn(
      async (handoff: ParentJobHandoff): Promise<WorkflowLoopResult> => {
        expect(handoff).toEqual(HANDOFF);
        return { ok: true };
      },
    );
    const { runWorktreeWorkflow } = await import('../workflow');
    const options: WorktreeWorkflowOptions = {
      acquire: { lockedBy: 'job-1' },
      runLoop,
      tracker,
    };

    const result = await runWorktreeWorkflow(options);

    expect(runLoop).toHaveBeenCalledTimes(1);
    expect(result.acquire).toEqual({ handoff: HANDOFF, ok: true });
    expect(result.loop).toEqual({ ok: true });
    expect(result.ensureCommit).toEqual({ ok: true });
    expect(result.pushResult).toEqual({ ok: true });
    expect(result.released).toBe(true);
    expect(tracker.releaseCalls).toBe(1);
  });

  it('skips ensure-commit and push when the loop returns ok: false', async () => {
    const tracker = createFakeTracker();
    const runLoop = vi.fn(async (): Promise<WorkflowLoopResult> => ({
      ok: false,
      reason: 'ralph iteration failed',
    }));
    const { runWorktreeWorkflow } = await import('../workflow');
    const options: WorktreeWorkflowOptions = {
      acquire: { lockedBy: 'job-1' },
      runLoop,
      tracker,
    };

    const result = await runWorktreeWorkflow(options);

    expect(result.loop).toEqual({
      ok: false,
      reason: 'ralph iteration failed',
    });
    expect(result.ensureCommit).toBeUndefined();
    expect(result.pushResult).toBeUndefined();
    expect(result.released).toBe(true);
    expect(tracker.releaseCalls).toBe(1);
  });

  it('converts a thrown Error from the loop into a failed WorkflowLoopResult and still releases', async () => {
    const tracker = createFakeTracker();
    const runLoop = vi.fn(async (): Promise<WorkflowLoopResult> => {
      throw new Error('boom');
    });
    const { runWorktreeWorkflow } = await import('../workflow');
    const options: WorktreeWorkflowOptions = {
      acquire: { lockedBy: 'job-1' },
      runLoop,
      tracker,
    };

    const result = await runWorktreeWorkflow(options);

    expect(result.loop).toEqual({ ok: false, reason: 'boom' });
    expect(result.ensureCommit).toBeUndefined();
    expect(result.pushResult).toBeUndefined();
    expect(result.released).toBe(true);
  });

  it('stringifies a non-Error thrown value from the loop', async () => {
    const tracker = createFakeTracker();
    const runLoop = vi.fn(async (): Promise<WorkflowLoopResult> => {
      throw 'raw string failure';
    });
    const { runWorktreeWorkflow } = await import('../workflow');
    const options: WorktreeWorkflowOptions = {
      acquire: { lockedBy: 'job-1' },
      runLoop,
      tracker,
    };

    const result = await runWorktreeWorkflow(options);

    expect(result.loop).toEqual({ ok: false, reason: 'raw string failure' });
  });

  it('reports released: false when the tracker fails to release', async () => {
    const tracker = createFakeTracker({ ok: false, reason: 'not_locked' });
    const runLoop = vi.fn(async (): Promise<WorkflowLoopResult> => ({
      ok: true,
    }));
    const { runWorktreeWorkflow } = await import('../workflow');
    const options: WorktreeWorkflowOptions = {
      acquire: { lockedBy: 'job-1' },
      runLoop,
      tracker,
    };

    const result = await runWorktreeWorkflow(options);

    expect(result.released).toBe(false);
    expect(tracker.releaseCalls).toBe(1);
  });

  it('surfaces an ensure-commit failure while still marking the target released', async () => {
    mockState.ensureCommitResult = {
      detail: 'M src/foo.ts',
      ok: false,
      reason: 'working_tree_dirty',
    };
    const tracker = createFakeTracker();
    const runLoop = vi.fn(async (): Promise<WorkflowLoopResult> => ({
      ok: true,
    }));
    const { runWorktreeWorkflow } = await import('../workflow');
    const options: WorktreeWorkflowOptions = {
      acquire: { lockedBy: 'job-1' },
      runLoop,
      tracker,
    };

    const result = await runWorktreeWorkflow(options);

    expect(result.ensureCommit).toEqual({
      detail: 'M src/foo.ts',
      ok: false,
      reason: 'working_tree_dirty',
    });
    expect(result.released).toBe(true);
  });

  it('surfaces a push failure while still marking the target released', async () => {
    mockState.pushResult = { ok: false, stderr: 'remote rejected' };
    const tracker = createFakeTracker();
    const runLoop = vi.fn(async (): Promise<WorkflowLoopResult> => ({
      ok: true,
    }));
    const { runWorktreeWorkflow } = await import('../workflow');
    const options: WorktreeWorkflowOptions = {
      acquire: { lockedBy: 'job-1' },
      runLoop,
      tracker,
    };

    const result = await runWorktreeWorkflow(options);

    expect(result.pushResult).toEqual({ ok: false, stderr: 'remote rejected' });
    expect(result.released).toBe(true);
  });
});
