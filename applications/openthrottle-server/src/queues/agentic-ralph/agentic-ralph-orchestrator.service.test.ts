/**
 * @description Unit tests for in-process Ralph orchestrator run-start worktree
 * checkout registration (soft-fail, once-per-start, skip when checkout_id set)
 * and the per-user foreign-skill injection gate (opt-in via the actor's checkout).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import type { AgenticWorkflowRegistry } from '@openthrottle/nestjs-agentic-workflow';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanRunsService,
  RepositoryCheckoutsService,
  type PlanRun,
  type RepositoryCheckout,
} from '@openthrottle/nestjs-repositories';
import { PlanRunWorktreeCheckoutService } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.service';
import { AgenticRalphOrchestratorService } from './agentic-ralph-orchestrator.service';

// Force the run's path to read as foreign and stub the materializer so the gate is
// exercised deterministically (no filesystem, no env-derived OT-root fragility).
const { mockEnsureMaterialized, mockResolveForeign } = vi.hoisted(() => ({
  mockEnsureMaterialized: vi.fn(),
  mockResolveForeign: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();
  return {
    ...actual,
    ensureMaterialized: mockEnsureMaterialized,
    resolveForeignWorkspaceContext: mockResolveForeign,
  };
});

const mockExecute = vi.fn();
const mockCreateOrchestrator = vi.fn(() => ({ execute: mockExecute }));
const mockResolve = vi.fn(() => ({
  createOrchestrator: mockCreateOrchestrator,
}));

vi.mock('@tools/workflows', () => ({
  applyWorkflowRalphDebugCli: vi.fn(),
  applyWorkflowRalphOtRootFromConfig: vi.fn(),
  loadWorkflowRalphConfig: vi.fn(() => ({})),
  mergePlanRunTuningWithWorkflowRalphConfig: vi.fn(
    (tuning: unknown) => tuning ?? {},
  ),
}));

vi.mock('@openthrottle/openthrottle-agentic-ralph', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-ralph')
    >();

  return {
    ...actual,
    buildRalphFlowContextFromPlanRunTuning: vi.fn(() => ({
      debug: false,
      iterations: 1,
      mode: 'plan',
      planId: PLAN_ID,
      prompt: '/agents-ralph',
    })),
  };
});

const PLAN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PLAN_RUN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CHECKOUT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const QUEUE_NAME = 'Plans';
const QUEUE_JOB_ID = 'job-orch-1';
const WORKTREE_PATH =
  '/Users/matt/.cursor/worktrees/openthrottle/auto-register';

const buildRun = (overrides: Partial<PlanRun> = {}): PlanRun =>
  createMock<PlanRun>({
    actorUserId: USER_ID,
    bullmqJobId: QUEUE_JOB_ID,
    checkoutId: null,
    id: PLAN_RUN_ID,
    planId: PLAN_ID,
    queueName: QUEUE_NAME,
    ...overrides,
  });

describe('AgenticRalphOrchestratorService worktree checkout registration', () => {
  const mockFindByQueueNameAndBullmqJobId = vi.fn();
  const mockReadCancelRequested = vi.fn().mockResolvedValue(null);
  const mockRegister = vi.fn().mockResolvedValue(null);
  const mockFindByUserAndPath = vi.fn();
  const mockDebug = vi.fn();
  const mockWarn = vi.fn();

  let service: AgenticRalphOrchestratorService;

  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue({ reason: 'done', status: 'finished' });
    mockCreateOrchestrator.mockClear();
    mockResolve.mockClear();
    mockFindByQueueNameAndBullmqJobId.mockReset();
    mockRegister.mockReset();
    mockRegister.mockResolvedValue(null);
    mockFindByUserAndPath.mockReset();
    mockFindByUserAndPath.mockResolvedValue(null);
    mockEnsureMaterialized.mockReset();
    mockEnsureMaterialized.mockReturnValue({
      injectedNames: ['ot-plans'],
      warnings: [],
    });
    mockResolveForeign.mockReset();
    mockResolveForeign.mockReturnValue({
      isForeign: true,
      openThrottleRoot: '/ot-root',
    });
    mockDebug.mockReset();
    mockWarn.mockReset();

    service = new AgenticRalphOrchestratorService(
      createMock<AgenticWorkflowRegistry>({ resolve: mockResolve }),
      createMock<LoggerService>({ debug: mockDebug, warn: mockWarn }),
      createMock<PlanRunsService>({
        findByQueueNameAndBullmqJobId: mockFindByQueueNameAndBullmqJobId,
        readCancelRequested: mockReadCancelRequested,
      }),
      createMock<PlanRunWorktreeCheckoutService>({
        register: mockRegister,
      }),
      createMock<RepositoryCheckoutsService>({
        findByUserAndPath: mockFindByUserAndPath,
      }),
    );
  });

  const runWithCorrelation = async (): Promise<
    Awaited<
      ReturnType<AgenticRalphOrchestratorService['runPlanOrchestratorJob']>
    >
  > =>
    service.runPlanOrchestratorJob({
      correlation: {
        correlationId: QUEUE_JOB_ID,
        queueJobId: QUEUE_JOB_ID,
        queueName: QUEUE_NAME,
      },
      jobData: {
        planId: PLAN_ID,
        runKind: 'orchestrator',
        workingDirectory: WORKTREE_PATH,
      },
    });

  describe('when checkout_id is NULL', () => {
    it('invokes register once with the resolved path and actor before execute', async () => {
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(buildRun());

      const callOrder: string[] = [];
      mockRegister.mockImplementation(async () => {
        callOrder.push('register');
        return null;
      });
      mockExecute.mockImplementation(async () => {
        callOrder.push('execute');
        return { reason: 'done', status: 'finished' };
      });

      await runWithCorrelation();

      expect(mockFindByQueueNameAndBullmqJobId).toHaveBeenCalledTimes(1);
      expect(mockFindByQueueNameAndBullmqJobId).toHaveBeenCalledWith(
        QUEUE_NAME,
        QUEUE_JOB_ID,
      );
      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledWith({
        filesystemPath: WORKTREE_PATH,
        planRunId: PLAN_RUN_ID,
        userId: USER_ID,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['register', 'execute']);
    });
  });

  describe('when checkout_id is already set', () => {
    it('does not invoke register', async () => {
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
        buildRun({ checkoutId: CHECKOUT_ID }),
      );

      await runWithCorrelation();

      expect(mockRegister).not.toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('when register soft-fails', () => {
    it('continues the orchestrator run', async () => {
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(buildRun());
      mockRegister.mockRejectedValueOnce(new Error('upsert exploded'));

      await expect(runWithCorrelation()).resolves.toEqual({
        reason: 'done',
        status: 'finished',
      });

      expect(mockWarn).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('when actor_user_id is null', () => {
    it('skips register and still executes', async () => {
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
        buildRun({ actorUserId: null }),
      );

      await runWithCorrelation();

      expect(mockRegister).not.toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AgenticRalphOrchestratorService foreign-skill injection gate', () => {
  const mockFindByQueueNameAndBullmqJobId = vi.fn();
  const mockReadCancelRequested = vi.fn().mockResolvedValue(null);
  const mockRegister = vi.fn().mockResolvedValue(null);
  const mockFindByUserAndPath = vi.fn();

  let service: AgenticRalphOrchestratorService;

  const checkout = (enabled: boolean): RepositoryCheckout =>
    createMock<RepositoryCheckout>({
      filesystemPath: WORKTREE_PATH,
      foreignSkillInjectionEnabled: enabled,
      userId: USER_ID,
    });

  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue({ reason: 'done', status: 'finished' });
    mockCreateOrchestrator.mockClear();
    mockResolve.mockClear();
    mockFindByQueueNameAndBullmqJobId.mockReset();
    mockFindByQueueNameAndBullmqJobId.mockResolvedValue(buildRun());
    mockRegister.mockReset();
    mockRegister.mockResolvedValue(null);
    mockFindByUserAndPath.mockReset();
    mockEnsureMaterialized.mockReset();
    mockEnsureMaterialized.mockReturnValue({
      injectedNames: ['ot-plans'],
      warnings: [],
    });
    mockResolveForeign.mockReset();
    mockResolveForeign.mockReturnValue({
      isForeign: true,
      openThrottleRoot: '/ot-root',
    });

    service = new AgenticRalphOrchestratorService(
      createMock<AgenticWorkflowRegistry>({ resolve: mockResolve }),
      createMock<LoggerService>(),
      createMock<PlanRunsService>({
        findByQueueNameAndBullmqJobId: mockFindByQueueNameAndBullmqJobId,
        readCancelRequested: mockReadCancelRequested,
      }),
      createMock<PlanRunWorktreeCheckoutService>({ register: mockRegister }),
      createMock<RepositoryCheckoutsService>({
        findByUserAndPath: mockFindByUserAndPath,
      }),
    );
  });

  const run = async (): Promise<void> => {
    await service.runPlanOrchestratorJob({
      correlation: {
        correlationId: QUEUE_JOB_ID,
        queueJobId: QUEUE_JOB_ID,
        queueName: QUEUE_NAME,
      },
      jobData: {
        planId: PLAN_ID,
        runKind: 'orchestrator',
        workingDirectory: WORKTREE_PATH,
      },
    });
  };

  it('materializes and forwards injected skills when the actor opted the checkout in', async () => {
    mockFindByUserAndPath.mockResolvedValueOnce(checkout(true));

    await run();

    expect(mockFindByUserAndPath).toHaveBeenCalledWith(USER_ID, WORKTREE_PATH);
    expect(mockEnsureMaterialized).toHaveBeenCalledTimes(1);
    expect(mockEnsureMaterialized).toHaveBeenCalledWith(
      expect.objectContaining({ repoPath: WORKTREE_PATH }),
    );
    expect(mockExecute).toHaveBeenCalledWith({
      context: expect.objectContaining({ injectedSkillNames: ['ot-plans'] }),
    });
  });

  it('skips injection when the checkout is opted out', async () => {
    mockFindByUserAndPath.mockResolvedValueOnce(checkout(false));

    await run();

    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledWith({
      context: expect.not.objectContaining({
        injectedSkillNames: expect.anything(),
      }),
    });
  });

  it('skips injection when the path is not a registered checkout', async () => {
    mockFindByUserAndPath.mockResolvedValueOnce(null);

    await run();

    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
  });

  it('skips injection (no checkout lookup) when the run is not foreign', async () => {
    mockResolveForeign.mockReturnValueOnce({
      isForeign: false,
      openThrottleRoot: '/ot-root',
    });

    await run();

    expect(mockFindByUserAndPath).not.toHaveBeenCalled();
    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
  });

  it('skips injection when the actor user cannot be resolved', async () => {
    mockFindByQueueNameAndBullmqJobId.mockResolvedValue(
      buildRun({ actorUserId: null }),
    );

    await run();

    expect(mockFindByUserAndPath).not.toHaveBeenCalled();
    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
  });
});
