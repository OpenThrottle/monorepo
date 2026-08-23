/**
 * @description Unit tests for in-process Ralph orchestrator run-start worktree
 * checkout registration (soft-fail, once-per-start, skip when checkout_id set)
 * and the per-user foreign-skill injection gate (opt-in via the actor's checkout).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { asMock } from '@openthrottle/nestjs-testing';
import type { AgenticWorkflowRegistry } from '@openthrottle/nestjs-agentic-workflow';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Repository } from 'typeorm';
import {
  PlanOutputStreamService,
  PlanRunsService,
  RepositoryCheckoutsService,
  UserWorkspaceSettingsService,
  type PlanOutputStreamChunk,
  type PlanRun,
  type RepositoryCheckout,
  type UserWorkspaceSettings,
} from '@openthrottle/nestjs-repositories';
import { PlanRunWorktreeCheckoutService } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.service';
import { PlanRunWorkspacePreflightService } from '../../services/plan-run-workspace-preflight/plan-run-workspace-preflight.service';
import { PlanRunWorktreeProvisionService } from '../../services/plan-run-worktree-provision/plan-run-worktree-provision.service';
import { AgenticRalphOrchestratorService } from './agentic-ralph-orchestrator.service';

// Force the run's path to read as foreign and stub the materializer so the gate is
// exercised deterministically (no filesystem, no env-derived OT-root fragility).
const {
  mockBuildRalphFlowContext,
  mockEnsureMaterialized,
  mockResolveForeign,
} = vi.hoisted(() => ({
  mockBuildRalphFlowContext: vi.fn(() => ({
    debug: false,
    iterations: 1,
    mode: 'plan',
    planId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    prompt: '/agents-ralph',
  })),
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
    buildRalphFlowContextFromPlanRunTuning: mockBuildRalphFlowContext,
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

const PROVISIONED_WORKTREE_PATH =
  '/Users/matt/Development/openthrottle-worktrees/plan-aaaaaaaa';
const CONFIGURED_WORKTREE_ROOT = '/srv/worktrees';

const mockProvision = vi.fn(async () => PROVISIONED_WORKTREE_PATH);
const mockPreflightCheck = vi.fn((): readonly string[] => []);
const mockOutputCreate = vi.fn((entity: unknown) => entity);
const mockOutputSave = vi.fn(async (entity: unknown) => entity);

// Narrow partial repository: the orchestrator only ever calls create + save on it.
const planOutputStreamServiceMock = (): PlanOutputStreamService =>
  createMock<PlanOutputStreamService>({
    getRepository: () =>
      asMock<Repository<PlanOutputStreamChunk>>({
        create: mockOutputCreate,
        save: mockOutputSave,
      }),
  });
const mockGetOrCreateForUser = vi.fn(async () =>
  createMock<UserWorkspaceSettings>({
    userId: USER_ID,
    worktreeRoot: CONFIGURED_WORKTREE_ROOT,
  }),
);

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
    mockProvision.mockReset();
    mockProvision.mockResolvedValue(PROVISIONED_WORKTREE_PATH);
    mockPreflightCheck.mockReset();
    mockPreflightCheck.mockReturnValue([]);
    mockOutputSave.mockClear();
    mockOutputCreate.mockClear();
    mockGetOrCreateForUser.mockReset();
    mockGetOrCreateForUser.mockResolvedValue(
      createMock<UserWorkspaceSettings>({
        userId: USER_ID,
        worktreeRoot: CONFIGURED_WORKTREE_ROOT,
      }),
    );
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
      planOutputStreamServiceMock(),
      createMock<PlanRunsService>({
        findByQueueNameAndBullmqJobId: mockFindByQueueNameAndBullmqJobId,
        readCancelRequested: mockReadCancelRequested,
      }),
      createMock<PlanRunWorktreeCheckoutService>({
        register: mockRegister,
      }),
      createMock<PlanRunWorkspacePreflightService>({
        check: mockPreflightCheck,
      }),
      createMock<PlanRunWorktreeProvisionService>({
        provision: mockProvision,
      }),
      createMock<RepositoryCheckoutsService>({
        findByUserAndPath: mockFindByUserAndPath,
      }),
      createMock<UserWorkspaceSettingsService>({
        getOrCreateForUser: mockGetOrCreateForUser,
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
    mockProvision.mockReset();
    mockProvision.mockResolvedValue(PROVISIONED_WORKTREE_PATH);
    mockPreflightCheck.mockReset();
    mockPreflightCheck.mockReturnValue([]);
    mockOutputSave.mockClear();
    mockOutputCreate.mockClear();
    mockGetOrCreateForUser.mockReset();
    mockGetOrCreateForUser.mockResolvedValue(
      createMock<UserWorkspaceSettings>({
        userId: USER_ID,
        worktreeRoot: CONFIGURED_WORKTREE_ROOT,
      }),
    );
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
      planOutputStreamServiceMock(),
      createMock<PlanRunsService>({
        findByQueueNameAndBullmqJobId: mockFindByQueueNameAndBullmqJobId,
        readCancelRequested: mockReadCancelRequested,
      }),
      createMock<PlanRunWorktreeCheckoutService>({ register: mockRegister }),
      createMock<PlanRunWorkspacePreflightService>({
        check: mockPreflightCheck,
      }),
      createMock<PlanRunWorktreeProvisionService>({
        provision: mockProvision,
      }),
      createMock<RepositoryCheckoutsService>({
        findByUserAndPath: mockFindByUserAndPath,
      }),
      createMock<UserWorkspaceSettingsService>({
        getOrCreateForUser: mockGetOrCreateForUser,
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

describe('AgenticRalphOrchestratorService worktree provisioning', () => {
  const mockFindByQueueNameAndBullmqJobId = vi.fn();
  const mockReadCancelRequested = vi.fn().mockResolvedValue(null);
  const mockRegister = vi.fn().mockResolvedValue(null);
  const mockFindByUserAndPath = vi.fn().mockResolvedValue(null);
  const mockWarn = vi.fn();

  let service: AgenticRalphOrchestratorService;

  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue({ reason: 'done', status: 'finished' });
    mockFindByQueueNameAndBullmqJobId.mockReset();
    mockFindByQueueNameAndBullmqJobId.mockResolvedValue(buildRun());
    mockRegister.mockReset();
    mockRegister.mockResolvedValue(null);
    mockFindByUserAndPath.mockReset();
    mockFindByUserAndPath.mockResolvedValue(null);
    mockProvision.mockReset();
    mockProvision.mockResolvedValue(PROVISIONED_WORKTREE_PATH);
    mockPreflightCheck.mockReset();
    mockPreflightCheck.mockReturnValue([]);
    mockOutputSave.mockClear();
    mockOutputCreate.mockClear();
    mockGetOrCreateForUser.mockReset();
    mockGetOrCreateForUser.mockResolvedValue(
      createMock<UserWorkspaceSettings>({
        userId: USER_ID,
        worktreeRoot: CONFIGURED_WORKTREE_ROOT,
      }),
    );
    mockResolveForeign.mockReset();
    mockResolveForeign.mockReturnValue({
      isForeign: false,
      openThrottleRoot: '/ot-root',
    });
    mockWarn.mockReset();

    service = new AgenticRalphOrchestratorService(
      createMock<AgenticWorkflowRegistry>({ resolve: mockResolve }),
      createMock<LoggerService>({ warn: mockWarn }),
      planOutputStreamServiceMock(),
      createMock<PlanRunsService>({
        findByQueueNameAndBullmqJobId: mockFindByQueueNameAndBullmqJobId,
        readCancelRequested: mockReadCancelRequested,
      }),
      createMock<PlanRunWorktreeCheckoutService>({ register: mockRegister }),
      createMock<PlanRunWorkspacePreflightService>({
        check: mockPreflightCheck,
      }),
      createMock<PlanRunWorktreeProvisionService>({
        provision: mockProvision,
      }),
      createMock<RepositoryCheckoutsService>({
        findByUserAndPath: mockFindByUserAndPath,
      }),
      createMock<UserWorkspaceSettingsService>({
        getOrCreateForUser: mockGetOrCreateForUser,
      }),
    );
  });

  const runWithWorktree = async (
    ralph: Record<string, unknown> = { worktree: 'plan-aaaaaaaa' },
  ): Promise<unknown> =>
    service.runPlanOrchestratorJob({
      correlation: {
        correlationId: QUEUE_JOB_ID,
        queueJobId: QUEUE_JOB_ID,
        queueName: QUEUE_NAME,
      },
      jobData: {
        planId: PLAN_ID,
        ralph,
        runKind: 'orchestrator',
        workingDirectory: WORKTREE_PATH,
      },
    });

  it('provisions the named worktree from the base checkout and runs the agent inside it', async () => {
    await runWithWorktree();

    expect(mockProvision).toHaveBeenCalledWith({
      baseCheckoutPath: WORKTREE_PATH,
      worktreeName: 'plan-aaaaaaaa',
      worktreeRoot: CONFIGURED_WORKTREE_ROOT,
    });
    expect(mockExecute).toHaveBeenCalledWith({
      context: expect.objectContaining({
        workingDirectory: PROVISIONED_WORKTREE_PATH,
      }),
    });
  });

  it('registers the checkout against the provisioned worktree, not the base checkout', async () => {
    await runWithWorktree();

    expect(mockRegister).toHaveBeenCalledWith({
      filesystemPath: PROVISIONED_WORKTREE_PATH,
      planRunId: PLAN_RUN_ID,
      userId: USER_ID,
    });
  });

  it('keeps the agent CLI -w flag off so the run cannot end up with two worktrees', async () => {
    await runWithWorktree({ worktree: 'plan-aaaaaaaa', worktreeBase: 'main' });

    expect(mockBuildRalphFlowContext).toHaveBeenCalledWith(
      expect.objectContaining({
        ralph: expect.not.objectContaining({ worktree: expect.anything() }),
      }),
    );
    expect(mockBuildRalphFlowContext).toHaveBeenCalledWith(
      expect.objectContaining({
        ralph: expect.not.objectContaining({ worktreeBase: expect.anything() }),
      }),
    );
  });

  it('preflights the worktree, not the process cwd, and writes warnings to the plan output stream', async () => {
    mockPreflightCheck.mockReturnValueOnce([
      'No .cursor/mcp.json in the worktree',
    ]);

    await runWithWorktree();

    expect(mockPreflightCheck).toHaveBeenCalledWith({
      backend: 'cursor',
      workingDirectory: PROVISIONED_WORKTREE_PATH,
    });
    expect(mockOutputCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('No .cursor/mcp.json in the worktree'),
        planId: PLAN_ID,
      }),
    );
    expect(mockOutputSave).toHaveBeenCalledTimes(1);
  });

  it('writes nothing to the output stream when the preflight is clean', async () => {
    await runWithWorktree();

    expect(mockPreflightCheck).toHaveBeenCalledTimes(1);
    expect(mockOutputSave).not.toHaveBeenCalled();
  });

  it('fails the run when provisioning fails instead of falling back to the base checkout', async () => {
    mockProvision.mockRejectedValueOnce(new Error('worktree:new exploded'));

    await expect(runWithWorktree()).rejects.toThrow(/worktree:new exploded/);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('runs in the base checkout when the payload opts out of a worktree', async () => {
    await runWithWorktree({});

    expect(mockProvision).not.toHaveBeenCalled();
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ filesystemPath: WORKTREE_PATH }),
    );
  });

  it('lets the script pick the root when the actor has none configured', async () => {
    mockGetOrCreateForUser.mockResolvedValueOnce(
      createMock<UserWorkspaceSettings>({
        userId: USER_ID,
        worktreeRoot: null,
      }),
    );

    await runWithWorktree();

    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ worktreeRoot: null }),
    );
  });
});
