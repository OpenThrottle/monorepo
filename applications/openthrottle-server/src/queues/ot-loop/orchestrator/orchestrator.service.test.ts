/**
 * @description Unit tests for the OT Loop orchestrator service's dependency wiring, over fakes: the
 * worker env drops the OT credentials, the model is routed from the OT root, the final plan status is
 * written, a red setup fails the run without starting the loop, and every outcome maps to the
 * `WorkflowRunResult` the processor settles.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRunsService } from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import type {
  LoopDeps,
  LoopOutcome,
  LoopTask,
} from '@openthrottle/openthrottle-agentic-loop';
import {
  AppendPlanOutputDocument,
  CreateTaskDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
} from '@openthrottle/openthrottle-agentic-ralph';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanRunWorkspaceService } from '../../../services/plan-run-workspace/plan-run-workspace.service.ts';
import type { PreparedPlanRunWorkspace } from '../../../services/plan-run-workspace/plan-run-workspace.types.ts';
import type { OtLoopExecuteGraphql } from '../ot-loop.types.ts';
import { OtLoopOrchestratorService } from './orchestrator.service.ts';

const mocks = vi.hoisted(() => ({
  discoverAgentClis: vi.fn(),
  finalizeOtLoopRun: vi.fn(),
  getOpenThrottleRoot: vi.fn(),
  merge: vi.fn(),
  prepareDraft: vi.fn(),
  prepareResultDir: vi.fn(),
  readPolicy: vi.fn(),
  resolveCommands: vi.fn(),
  runCommandSequence: vi.fn(),
  runDriver: vi.fn(),
  runOtLoop: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-loop', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-loop')
    >();

  return {
    ...actual,
    finalizeOtLoopRun: mocks.finalizeOtLoopRun,
    prepareResultDir: mocks.prepareResultDir,
    readModelRoutingPolicyFromRoot: mocks.readPolicy,
    resolveOtLoopCommands: mocks.resolveCommands,
    runCommandSequence: mocks.runCommandSequence,
    runOtLoop: mocks.runOtLoop,
  };
});

vi.mock('@openthrottle/openthrottle-agentic-ralph', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-ralph')
    >();

  return {
    ...actual,
    createDefaultWorkflowRalphCommandRunner: () => vi.fn(),
    preparePlanRunPrDraftDir: mocks.prepareDraft,
  };
});

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();

  return {
    ...actual,
    discoverAgentClis: mocks.discoverAgentClis,
    getOpenThrottleRoot: mocks.getOpenThrottleRoot,
  };
});

vi.mock('@openthrottle/openthrottle-drivers', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/openthrottle-drivers')>();

  return { ...actual, runDriverAsync: mocks.runDriver };
});

vi.mock('@tools/workflows', () => ({
  mergePlanRunTuningWithWorkflowRalphConfig: mocks.merge,
}));

type CancelRead = Awaited<ReturnType<PlanRunsService['readCancelRequested']>>;

const PLAN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WORKTREE = `/worktrees/plan-aaaaaaaa`;
const OT_ROOT = `/ot-root`;
const FINISHED = {
  exitCode: 0,
  headSha: 'abc123',
  prNumber: 5,
  reason: 'workflow_complete',
  status: 'finished',
} as const;

const task = (overrides: Partial<LoopTask> = {}): LoopTask => {
  return {
    category: 'implementation',
    createdAt: '2026-11-09T00:00:00.000Z',
    description: 'A description long enough to be delegated to a worker.',
    id: 't1',
    requirements: [],
    sortOrder: 1000,
    status: 'COMPLETED',
    title: 'Task',
    ...overrides,
  };
};

const row = (loopTask: LoopTask): Record<string, unknown> => {
  return {
    ...loopTask,
    planId: PLAN_ID,
    requirementsJson: '[]',
  };
};

const RESOLVED = {
  finalValidation: [],
  kind: 'resolved',
  setup: [],
  source: 'repo-file',
  validation: ['pnpm test'],
} as const;

describe('OtLoopOrchestratorService', () => {
  const calls: { document: unknown; variables: unknown }[] = [];
  let tasks: LoopTask[];
  let readCancelRequested: ReturnType<
    typeof vi.fn<PlanRunsService['readCancelRequested']>
  >;
  let prepare: ReturnType<typeof vi.fn<PlanRunWorkspaceService['prepare']>>;
  let service: OtLoopOrchestratorService;

  const execute = async (
    document: unknown,
    variables?: unknown,
  ): Promise<unknown> => {
    calls.push({ document, variables });

    if (document === GetTasksByPlanIdDocument) {
      return { tasksByPlanId: tasks.map(row) };
    }

    if (document === CreateTaskDocument) {
      return { createTask: { id: 'final-validation-task' } };
    }

    return {};
  };
  const callsTo = (document: unknown): { variables: unknown }[] => {
    return calls.filter((call) => call.document === document);
  };
  const planStatusWrites = (): unknown[] => {
    return callsTo(UpdatePlanDocument).map((call) => call.variables);
  };

  const runJob = (
    overrides: {
      readonly jobData?: Record<string, unknown>;
      readonly signal?: AbortSignal;
    } = {},
  ): ReturnType<OtLoopOrchestratorService['runPlanOrchestratorJob']> => {
    return service.runPlanOrchestratorJob({
      correlation: {
        correlationId: 'job-1',
        queueJobId: 'job-1',
        queueName: 'Plans',
      },
      jobData: {
        executionBackend: 'claude',
        planId: PLAN_ID,
        ralph: { worktree: 'plan-aaaaaaaa' },
        runKind: 'orchestrator',
        runner: 'ot-loop',
        ...overrides.jobData,
      },
      signal: overrides.signal ?? new AbortController().signal,
      workSessionId: 'run-session',
    });
  };
  const loopReturns = (outcome: LoopOutcome): void => {
    mocks.runOtLoop.mockResolvedValue(outcome);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    tasks = [task()];
    readCancelRequested = vi.fn<PlanRunsService['readCancelRequested']>();
    readCancelRequested.mockResolvedValue(null);
    prepare = vi.fn<PlanRunWorkspaceService['prepare']>();
    prepare.mockResolvedValue(
      asMock<PreparedPlanRunWorkspace>({
        config: {},
        injectedSkillNames: [],
        run: { id: 'run-1' },
        workingDirectory: WORKTREE,
      }),
    );
    mocks.merge.mockReturnValue({
      backend: 'claude',
      model: 'sonnet-run',
      worktreeBase: 'develop',
    });
    mocks.resolveCommands.mockResolvedValue(RESOLVED);
    mocks.runCommandSequence.mockResolvedValue({ kind: 'green' });
    mocks.prepareResultDir.mockResolvedValue(undefined);
    mocks.prepareDraft.mockResolvedValue(
      '/worktrees/plan-aaaaaaaa/.ot-pr-draft',
    );
    mocks.getOpenThrottleRoot.mockReturnValue(OT_ROOT);
    mocks.readPolicy.mockResolvedValue({
      kind: 'invalid',
      reason: 'no policy in this test',
    });
    mocks.discoverAgentClis.mockResolvedValue({ agents: [] });
    mocks.finalizeOtLoopRun.mockResolvedValue(FINISHED);
    loopReturns({ completedTaskIds: ['t1'], kind: 'complete' });

    service = new OtLoopOrchestratorService(
      asMock<OtLoopExecuteGraphql>(execute),
      createMock<LoggerService>(),
      createMock<PlanRunsService>({ readCancelRequested }),
      createMock<PlanRunWorkspaceService>({ prepare }),
    );
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  /** Runs the loop mock's captured deps. */
  const capturedDeps = (): LoopDeps => {
    const options = mocks.runOtLoop.mock.calls[0]?.[0];

    if (options === undefined) {
      throw new Error('the loop was never started');
    }

    return options.deps;
  };

  describe('workspace', () => {
    it('prepares the shared workspace without the MCP preflight or skill injection', async () => {
      await runJob();

      expect(prepare).toHaveBeenCalledWith(
        expect.objectContaining({
          skipMcpPreflight: true,
          skipSkillInjection: true,
        }),
      );
    });

    it('lets a workspace failure propagate so BullMQ retries it, as for Ralph', async () => {
      prepare.mockRejectedValueOnce(new Error('worktree provisioning failed'));

      await expect(runJob()).rejects.toThrow('worktree provisioning failed');
    });
  });

  describe('start failures return a failed result and never start the loop', () => {
    it('fails with workflow_input_required when no validation command resolves', async () => {
      mocks.resolveCommands.mockResolvedValue({
        kind: 'none',
        message: 'OT Loop needs a validation command',
      });

      const result = await runJob();

      expect(result).toEqual({
        exitCode: 1,
        reason: 'workflow_input_required',
        status: 'failed',
      });
      expect(mocks.runOtLoop).not.toHaveBeenCalled();
      expect(mocks.finalizeOtLoopRun).not.toHaveBeenCalled();
    });

    it('fails on a red setup command, leaving the plan status to the processor to restore', async () => {
      mocks.resolveCommands.mockResolvedValue({
        ...RESOLVED,
        setup: ['pnpm nx run-many --target=codegen-graphql --all'],
      });
      mocks.runCommandSequence.mockResolvedValue({
        command: 'pnpm nx run-many --target=codegen-graphql --all',
        exitCode: 1,
        kind: 'red',
        tail: 'codegen blew up',
      });

      const result = await runJob();

      expect(result).toMatchObject({
        reason: 'workflow_unhandled',
        status: 'failed',
      });
      expect(mocks.runOtLoop).not.toHaveBeenCalled();
      expect(mocks.finalizeOtLoopRun).not.toHaveBeenCalled();
      expect(planStatusWrites()).toEqual([]);
    });

    it('runs the setup commands once, in the worktree, before the loop', async () => {
      mocks.resolveCommands.mockResolvedValue({
        ...RESOLVED,
        setup: ['pnpm codegen'],
      });

      await runJob();

      expect(mocks.runCommandSequence).toHaveBeenCalledTimes(1);
      expect(mocks.runCommandSequence).toHaveBeenCalledWith(
        expect.objectContaining({ commands: ['pnpm codegen'], cwd: WORKTREE }),
      );
      expect(mocks.runCommandSequence.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.runOtLoop.mock.invocationCallOrder[0] ?? 0,
      );
    });

    it('treats a cancel during setup as a cancel, not a failure', async () => {
      mocks.resolveCommands.mockResolvedValue({
        ...RESOLVED,
        setup: ['pnpm codegen'],
      });
      mocks.runCommandSequence.mockResolvedValue({ kind: 'aborted' });

      const result = await runJob();

      expect(result).toMatchObject({ reason: 'workflow_cancelled' });
      expect(mocks.runOtLoop).not.toHaveBeenCalled();
    });

    it('prefers the plan override for setup commands over the repo file', async () => {
      mocks.resolveCommands.mockResolvedValue({
        ...RESOLVED,
        setup: ['from file'],
      });

      await runJob({ jobData: { otLoop: { setupCommands: ['from plan'] } } });

      expect(mocks.runCommandSequence).toHaveBeenCalledWith(
        expect.objectContaining({ commands: ['from plan'] }),
      );
    });
  });

  describe('worker env', () => {
    it('drops the OT credentials from the env the agent CLI runs with, in the worktree', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_secret';
      mocks.runDriver.mockResolvedValue('no result file written');
      mocks.runOtLoop.mockImplementation(
        async ({ deps }: { deps: LoopDeps }) => {
          await deps.worker.run({
            guidance: [],
            model: 'sonnet',
            previousFailure: undefined,
            signal: new AbortController().signal,
            task: task({ status: 'IN_PROGRESS' }),
          });

          return { completedTaskIds: [], kind: 'complete' };
        },
      );

      await runJob();

      const config = mocks.runDriver.mock.calls[0]?.[1];

      expect(config.cwd).toBe(WORKTREE);
      expect(config.env).toMatchObject({
        OPENTHROTTLE_MCP_AUTH_TOKEN: '',
        OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN: '',
        OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN: '',
        OT_MCP_AUTH_TOKEN_ENV_FILE: '',
      });
      expect(JSON.stringify(config.env)).not.toContain('ot_sa_secret');
    });
  });

  describe('model routing', () => {
    const policy = {
      categories: new Map([['documentation', 'cheap']]),
      defaultTier: 'standard',
      tiers: new Map([
        [
          'cheap',
          {
            agentModel: 'haiku',
            neverAutoRouted: false,
            recordAs: 'claude-haiku',
          },
        ],
        [
          'standard',
          {
            agentModel: 'sonnet',
            neverAutoRouted: false,
            recordAs: 'claude-sonnet',
          },
        ],
      ]),
    };

    it('reads the routing policy from the OpenThrottle root, never the worktree', async () => {
      await runJob();

      expect(mocks.readPolicy).toHaveBeenCalledWith(OT_ROOT);
      expect(mocks.readPolicy).not.toHaveBeenCalledWith(WORKTREE);
    });

    it('routes each task by category to a model the run driver lists', async () => {
      mocks.readPolicy.mockResolvedValue({ kind: 'ok', policy });
      mocks.discoverAgentClis.mockResolvedValue({
        agents: [{ backend: 'claude', models: ['haiku', 'sonnet'] }],
      });

      await runJob();

      const { modelFor } = capturedDeps();

      expect(modelFor(task({ category: 'documentation' }))).toBe('haiku');
      expect(modelFor(task({ category: 'implementation' }))).toBe('sonnet');
    });

    it('falls back to the run model when the driver lists no valid model for the tier', async () => {
      mocks.readPolicy.mockResolvedValue({ kind: 'ok', policy });
      mocks.discoverAgentClis.mockResolvedValue({
        agents: [{ backend: 'claude', models: ['something-else'] }],
      });

      await runJob();

      expect(capturedDeps().modelFor(task())).toBe('sonnet-run');
    });

    it('uses the run model when no OpenThrottle root resolves', async () => {
      mocks.getOpenThrottleRoot.mockReturnValue(undefined);

      await runJob();

      expect(mocks.readPolicy).not.toHaveBeenCalled();
      expect(capturedDeps().modelFor(task())).toBe('sonnet-run');
    });
  });

  describe('cancel', () => {
    it('reads the durable cancel marker, and treats the abort signal as cancelled', async () => {
      const controller = new AbortController();

      await runJob({ signal: controller.signal });

      const { cancel } = capturedDeps();

      expect(await cancel.isCancelled()).toBe(false);
      expect(readCancelRequested).toHaveBeenCalledWith(PLAN_ID);

      readCancelRequested.mockResolvedValueOnce(
        asMock<CancelRead>(new Date('2026-01-15T12:00:00.000Z')),
      );
      expect(await cancel.isCancelled()).toBe(true);

      readCancelRequested.mockRejectedValueOnce(new Error('db blip'));
      expect(await cancel.isCancelled()).toBe(false);

      controller.abort();
      expect(await cancel.isCancelled()).toBe(true);
      expect(cancel.signal).toBe(controller.signal);
    });
  });

  describe('outcome mapping', () => {
    it('complete: writes the plan COMPLETED, then finalizes with the completed task ids in task order', async () => {
      tasks = [
        task({ id: 't1', sortOrder: 2000 }),
        task({ id: 't2', sortOrder: 1000 }),
        task({ id: 't3', status: 'SKIPPED' }),
      ];

      const result = await runJob();

      expect(planStatusWrites()).toEqual([
        { input: { id: PLAN_ID, status: 'COMPLETED' } },
      ]);
      expect(mocks.finalizeOtLoopRun).toHaveBeenCalledWith(
        expect.objectContaining({
          baseBranch: 'develop',
          cwd: WORKTREE,
          draftDir: '/worktrees/plan-aaaaaaaa/.ot-pr-draft',
          outcome: 'complete',
          planId: PLAN_ID,
          squashSubject: undefined,
          taskIds: ['t2', 't1'],
        }),
      );
      expect(result).toEqual(FINISHED);
    });

    it('tasks blocked: writes the plan BLOCKED and finalizes as blocked', async () => {
      loopReturns({ blockedTaskIds: ['t2'], kind: 'tasks_blocked' });
      tasks = [task({ id: 't1' }), task({ id: 't2', status: 'BLOCKED' })];

      const result = await runJob();

      expect(planStatusWrites()).toEqual([
        { input: { id: PLAN_ID, status: 'BLOCKED' } },
      ]);
      expect(mocks.finalizeOtLoopRun).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'tasks_blocked', taskIds: ['t1'] }),
      );
      expect(result).toEqual(FINISHED);
    });

    it('falls back to the default base branch when the run names none', async () => {
      mocks.merge.mockReturnValue({ backend: 'claude', model: 'm' });

      await runJob();

      expect(mocks.finalizeOtLoopRun).toHaveBeenCalledWith(
        expect.objectContaining({ baseBranch: 'main' }),
      );
    });

    it('still finalizes when the plan status write is refused (the processor backstops it)', async () => {
      const refuse = asMock<OtLoopExecuteGraphql>(
        async (document: unknown, variables?: unknown) => {
          if (document === UpdatePlanDocument) {
            throw new Error('transition refused');
          }

          return execute(document, variables);
        },
      );
      service = new OtLoopOrchestratorService(
        refuse,
        createMock<LoggerService>(),
        createMock<PlanRunsService>({ readCancelRequested }),
        createMock<PlanRunWorkspaceService>({ prepare }),
      );

      const result = await runJob();

      expect(result).toEqual(FINISHED);
      expect(mocks.finalizeOtLoopRun).toHaveBeenCalledTimes(1);
    });

    it('cancelled: returns workflow_cancelled and neither writes the plan nor finalizes', async () => {
      loopReturns({ kind: 'cancelled', taskId: 't1' });

      const result = await runJob();

      expect(result).toEqual({
        exitCode: 0,
        reason: 'workflow_cancelled',
        status: 'finished',
      });
      expect(planStatusWrites()).toEqual([]);
      expect(mocks.finalizeOtLoopRun).not.toHaveBeenCalled();
    });

    it('usage limited: returns the limit the driver reported, for the resume', async () => {
      const limit = {
        rateLimitType: 'five_hour',
        resetsAt: '2026-11-09T20:00:00Z',
      };
      mocks.runDriver.mockImplementation(
        async (
          _driver: unknown,
          _config: unknown,
          options: {
            onUsageLimit: (l: typeof limit) => void;
            onExit: (c: number) => void;
          },
        ) => {
          options.onUsageLimit(limit);
          options.onExit(0);

          return 'limited';
        },
      );
      mocks.runOtLoop.mockImplementation(
        async ({ deps }: { deps: LoopDeps }) => {
          await deps.worker.run({
            guidance: [],
            model: undefined,
            previousFailure: undefined,
            signal: new AbortController().signal,
            task: task({ status: 'IN_PROGRESS' }),
          });

          return { kind: 'usage_limited', taskId: 't1' };
        },
      );

      const result = await runJob();

      expect(result).toEqual({
        exitCode: 0,
        reason: 'workflow_usage_limited',
        status: 'finished',
        usageLimit: limit,
      });
      expect(mocks.finalizeOtLoopRun).not.toHaveBeenCalled();
      expect(planStatusWrites()).toEqual([]);
    });

    it('usage limited with no reset reported: still pauses, reset unknown', async () => {
      loopReturns({ kind: 'usage_limited', taskId: 't1' });

      expect(await runJob()).toMatchObject({
        reason: 'workflow_usage_limited',
        usageLimit: { rateLimitType: null, resetsAt: null },
      });
    });

    it('failed loop: returns a failed result and does not finalize', async () => {
      loopReturns({ kind: 'failed', reason: 'tasks still open at close: t1' });

      expect(await runJob()).toEqual({
        exitCode: 1,
        reason: 'workflow_unhandled',
        status: 'failed',
      });
      expect(mocks.finalizeOtLoopRun).not.toHaveBeenCalled();
    });

    it('a throw from the loop or finalize becomes a failed result, never an unsettled run', async () => {
      mocks.finalizeOtLoopRun.mockRejectedValueOnce(new Error('git exploded'));

      expect(await runJob()).toMatchObject({ status: 'failed' });

      mocks.runOtLoop.mockRejectedValueOnce(new Error('loop exploded'));

      expect(await runJob()).toMatchObject({ status: 'failed' });
    });

    it('streams the failure reason to plan output', async () => {
      loopReturns({ kind: 'failed', reason: 'boom' });

      await runJob();

      const appended = callsTo(AppendPlanOutputDocument).map(
        (call) => call.variables,
      );

      expect(JSON.stringify(appended)).toContain('loop failed: boom');
    });
  });

  describe('final validation', () => {
    const FINAL = ['pnpm nx affected -t test --all'];

    beforeEach(() => {
      mocks.resolveCommands.mockResolvedValue({
        ...RESOLVED,
        finalValidation: FINAL,
      });
    });

    it('runs the whole-plan validation once before finalize when the plan is complete', async () => {
      await runJob();

      expect(mocks.runCommandSequence).toHaveBeenCalledWith(
        expect.objectContaining({ commands: FINAL, cwd: WORKTREE }),
      );
      expect(callsTo(CreateTaskDocument)).toHaveLength(0);
      expect(mocks.finalizeOtLoopRun).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'complete' }),
      );
    });

    it('red: creates a BLOCKED "Final validation failed" task with the tail, so the close ends BLOCKED', async () => {
      mocks.runCommandSequence.mockResolvedValue({
        command: FINAL[0],
        exitCode: 3,
        kind: 'red',
        tail: 'suite failed: 2 tests',
      });

      await runJob();

      const created = callsTo(CreateTaskDocument)[0]?.variables;

      expect(created).toMatchObject({
        input: {
          planId: PLAN_ID,
          status: 'BLOCKED',
          title: 'Final validation failed',
        },
      });
      expect(JSON.stringify(created)).toContain('suite failed: 2 tests');
      expect(planStatusWrites()).toEqual([
        { input: { id: PLAN_ID, status: 'BLOCKED' } },
      ]);
      expect(mocks.finalizeOtLoopRun).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'tasks_blocked' }),
      );
    });

    it('does not run when a task is already blocked: the plan ends BLOCKED regardless', async () => {
      loopReturns({ blockedTaskIds: ['t2'], kind: 'tasks_blocked' });

      await runJob();

      expect(mocks.runCommandSequence).not.toHaveBeenCalled();
    });

    it('a cancel during final validation is a cancel', async () => {
      mocks.runCommandSequence.mockResolvedValue({ kind: 'aborted' });

      expect(await runJob()).toMatchObject({ reason: 'workflow_cancelled' });
      expect(mocks.finalizeOtLoopRun).not.toHaveBeenCalled();
    });
  });

  describe('task-centric runs', () => {
    it('scopes the loop and finalize to the one task, and leaves the plan status to the processor', async () => {
      tasks = [task({ id: 't1' }), task({ id: 't2', sortOrder: 2000 })];

      await runJob({ jobData: { mode: 'task', taskId: 't1' } });

      expect(mocks.runOtLoop).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 't1' }),
      );
      expect(planStatusWrites()).toEqual([]);
      expect(mocks.finalizeOtLoopRun).toHaveBeenCalledWith(
        expect.objectContaining({ taskIds: ['t1'] }),
      );
    });

    it('runs the whole plan in plan mode, with the plan retry count', async () => {
      await runJob({ jobData: { otLoop: { maxRetries: 4 } } });

      expect(mocks.runOtLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: 4,
          planId: PLAN_ID,
          taskId: undefined,
        }),
      );
    });
  });

  describe('validation wiring', () => {
    it('hands the resolved validation commands to the validator, which streams to plan output tagged with the task', async () => {
      await runJob();

      const { validator } = capturedDeps();

      expect(validator).toBeDefined();
      expect(mocks.resolveCommands).toHaveBeenCalledWith(
        expect.objectContaining({ worktreeRoot: WORKTREE }),
      );
    });
  });
});
