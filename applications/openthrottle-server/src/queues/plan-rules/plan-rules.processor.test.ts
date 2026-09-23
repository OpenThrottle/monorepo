/**
 * @description Unit tests for {@link PlanRulesProcessor.process}: the shared
 * executor-contract behavior (fingerprint no-op on duplicate delivery, skip
 * without ledger row when no executor is registered, orphan flip on un-match)
 * and dispatch wiring.
 */

import { createMock } from '@golevelup/ts-vitest';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  PlansService,
  RuleApplication,
  RuleApplicationsService,
  TagActionRule,
  TagActionRulesService,
  TagsService,
  User,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture.service.ts';
import type { WorkLedgerRunService } from '../plans/work-ledger-run.service.ts';
import {
  type ActionExecutor,
  ActionExecutorRegistry,
} from './action-executor.ts';
import { PlanRulesProcessor } from './plan-rules.processor.ts';
import type { PlanRulesEvaluateJob } from './plan-rules.types.ts';

const planId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';

const buildJob = (): PlanRulesEvaluateJob =>
  asMock<PlanRulesEvaluateJob>({
    data: { planId, triggerKind: 'tag-changed' },
  });

const buildPlan = (): Plan =>
  asMock<Plan>({
    author: 'visormatt',
    id: planId,
    projectId: null,
    status: 'PENDING',
  });

const buildRule = (overrides: Partial<TagActionRule> = {}): TagActionRule =>
  asMock<TagActionRule>({
    actionPayload: { placement: 'first', skillSlug: 'grilling' },
    actionType: 'inject-task',
    enabled: true,
    environment: null,
    id: 'rule-1',
    projectId: null,
    status: null,
    tagAll: ['breakdown'],
    userId,
    ...overrides,
  });

describe('PlanRulesProcessor.process', () => {
  let processor: PlanRulesProcessor;
  let registry: ActionExecutorRegistry;
  let executor: ActionExecutor;
  let plansFindOne: ReturnType<typeof vi.fn>;
  let ruleApplicationsService: RuleApplicationsService;
  let tagActionRulesService: TagActionRulesService;
  let tagsService: TagsService;
  let usersService: UsersService;
  let workLedgerCapture: WorkLedgerCaptureService;
  let workLedgerRun: WorkLedgerRunService;
  let transactionManager: unknown;
  let mockTransaction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ActionExecutorRegistry(createMock<LoggerService>());
    executor = { actionType: 'inject-task', execute: vi.fn() };

    plansFindOne = vi.fn().mockResolvedValue(buildPlan());
    const plansService = createMock<PlansService>({
      getRepository: vi.fn(() => asMock({ findOne: plansFindOne })),
    });

    usersService = createMock<UsersService>({
      findByGithubUsername: vi
        .fn()
        .mockResolvedValue(asMock<User>({ id: userId })),
    });
    tagsService = createMock<TagsService>({
      getEffectiveTagSet: vi.fn().mockResolvedValue([
        {
          confidence: null,
          dimension: 'phase',
          source: 'agent',
          tag: 'breakdown',
        },
      ]),
    });
    tagActionRulesService = createMock<TagActionRulesService>({
      listEnabledForUser: vi.fn().mockResolvedValue([buildRule()]),
    });

    transactionManager = { __brand: 'transaction-manager' };
    mockTransaction = vi.fn(async (cb: (manager: unknown) => unknown) =>
      cb(transactionManager),
    );
    ruleApplicationsService = createMock<RuleApplicationsService>({
      findByRuleAndPlan: vi.fn().mockResolvedValue(null),
      getRepository: vi.fn(() =>
        asMock({ manager: { transaction: mockTransaction } }),
      ),
      orphanUnmatchedApplications: vi
        .fn()
        .mockResolvedValue({ rowsOrphaned: 0, softClosedTasks: [] }),
      record: vi.fn(),
    });

    workLedgerCapture = createMock<WorkLedgerCaptureService>({
      recordStatusChange: vi.fn().mockResolvedValue(undefined),
    });
    workLedgerRun = createMock<WorkLedgerRunService>({
      resolveActorServiceAccountId: vi
        .fn()
        .mockResolvedValue('service-account-1'),
    });

    processor = new PlanRulesProcessor(
      registry,
      createMock<LoggerService>(),
      plansService,
      ruleApplicationsService,
      tagActionRulesService,
      tagsService,
      usersService,
      workLedgerCapture,
      workLedgerRun,
    );
  });

  it('dispatches a fresh match to the registered executor', async () => {
    registry.register(executor);

    const result = await processor.process(buildJob());

    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.objectContaining({ ruleId: 'rule-1' }),
        ownerUserId: userId,
        rule: expect.objectContaining({ id: 'rule-1' }),
      }),
    );
    expect(result).toEqual({
      dispatched: 1,
      matched: 1,
      orphaned: 0,
      reconciled: 0,
      reinjected: 0,
      skipped: null,
    });
  });

  it('no-ops on duplicate delivery: an existing ledger row in ANY state blocks dispatch', async () => {
    registry.register(executor);
    vi.mocked(ruleApplicationsService.findByRuleAndPlan).mockResolvedValue(
      asMock<RuleApplication>({ state: 'flagged' }),
    );

    const result = await processor.process(buildJob());

    expect(executor.execute).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(0);
    expect(result.matched).toBe(1);
  });

  it("reconciles an already-'applied' matched row instead of re-dispatching execute", async () => {
    const reconcilingExecutor: ActionExecutor = {
      actionType: 'inject-task',
      execute: vi.fn(),
      reconcile: vi.fn(),
    };
    registry.register(reconcilingExecutor);
    const application = asMock<RuleApplication>({
      state: 'applied',
      taskId: '00000000-0000-4000-8000-00000000000a',
    });
    vi.mocked(ruleApplicationsService.findByRuleAndPlan).mockResolvedValue(
      application,
    );

    const result = await processor.process(buildJob());

    expect(reconcilingExecutor.execute).not.toHaveBeenCalled();
    expect(reconcilingExecutor.reconcile).toHaveBeenCalledTimes(1);
    expect(reconcilingExecutor.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.objectContaining({ ruleId: 'rule-1' }),
        application,
        ownerUserId: userId,
      }),
    );
    expect(result.reconciled).toBe(1);
    expect(result.dispatched).toBe(0);
  });

  it("does not reconcile an 'applied' row whose task was deleted (task_id NULL)", async () => {
    const reconcilingExecutor: ActionExecutor = {
      actionType: 'inject-task',
      execute: vi.fn(),
      reconcile: vi.fn(),
    };
    registry.register(reconcilingExecutor);
    vi.mocked(ruleApplicationsService.findByRuleAndPlan).mockResolvedValue(
      asMock<RuleApplication>({ state: 'applied', taskId: null }),
    );

    const result = await processor.process(buildJob());

    expect(reconcilingExecutor.reconcile).not.toHaveBeenCalled();
    expect(result.reconciled).toBe(0);
  });

  it("re-injects an 'applied' row whose task was deleted (task_id NULL)", async () => {
    const reinjectingExecutor: ActionExecutor = {
      actionType: 'inject-task',
      execute: vi.fn(),
      reconcile: vi.fn(),
      reinject: vi.fn(),
    };
    registry.register(reinjectingExecutor);
    vi.mocked(ruleApplicationsService.findByRuleAndPlan).mockResolvedValue(
      asMock<RuleApplication>({ state: 'applied', taskId: null }),
    );

    const result = await processor.process(buildJob());

    expect(reinjectingExecutor.reinject).toHaveBeenCalledTimes(1);
    expect(reinjectingExecutor.reconcile).not.toHaveBeenCalled();
    expect(reinjectingExecutor.execute).not.toHaveBeenCalled();
    expect(result.reinjected).toBe(1);
  });

  it('re-injects an orphaned row whose rule matches again', async () => {
    const reinjectingExecutor: ActionExecutor = {
      actionType: 'inject-task',
      execute: vi.fn(),
      reinject: vi.fn(),
    };
    registry.register(reinjectingExecutor);
    vi.mocked(ruleApplicationsService.findByRuleAndPlan).mockResolvedValue(
      asMock<RuleApplication>({ state: 'orphaned', taskId: 'old-task' }),
    );

    const result = await processor.process(buildJob());

    expect(reinjectingExecutor.reinject).toHaveBeenCalledTimes(1);
    expect(reinjectingExecutor.execute).not.toHaveBeenCalled();
    expect(result.reinjected).toBe(1);
  });

  it('skips a matched action with no registered executor WITHOUT writing a ledger row', async () => {
    const result = await processor.process(buildJob());

    expect(ruleApplicationsService.record).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(0);
    expect(result.matched).toBe(1);
  });

  it('flips un-matched applied rows to orphaned (matched rule ids are exempt)', async () => {
    registry.register(executor);
    vi.mocked(
      ruleApplicationsService.orphanUnmatchedApplications,
    ).mockResolvedValue({ rowsOrphaned: 2, softClosedTasks: [] });

    const result = await processor.process(buildJob());

    expect(
      ruleApplicationsService.orphanUnmatchedApplications,
    ).toHaveBeenCalledWith(planId, ['rule-1'], transactionManager);
    expect(result.orphaned).toBe(2);
  });

  it('captures a work-ledger status_change for each task the orphan flip soft-closed to SKIPPED', async () => {
    registry.register(executor);
    vi.mocked(
      ruleApplicationsService.orphanUnmatchedApplications,
    ).mockResolvedValue({
      rowsOrphaned: 1,
      softClosedTasks: [
        {
          from: 'PENDING',
          planId,
          taskId: 'task-orphaned-1',
          to: 'SKIPPED',
        },
      ],
    });

    const result = await processor.process(buildJob());

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(workLedgerRun.resolveActorServiceAccountId).toHaveBeenCalledTimes(1);
    expect(workLedgerCapture.recordStatusChange).toHaveBeenCalledWith(
      transactionManager,
      {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: 'service-account-1',
        entity: 'task',
        from: 'PENDING',
        id: 'task-orphaned-1',
        planId,
        taskId: 'task-orphaned-1',
        to: 'SKIPPED',
      },
    );
    expect(result.orphaned).toBe(1);
  });

  it('resolves no actor and captures nothing when the orphan flip soft-closes no task', async () => {
    registry.register(executor);
    vi.mocked(
      ruleApplicationsService.orphanUnmatchedApplications,
    ).mockResolvedValue({ rowsOrphaned: 1, softClosedTasks: [] });

    await processor.process(buildJob());

    expect(workLedgerRun.resolveActorServiceAccountId).not.toHaveBeenCalled();
    expect(workLedgerCapture.recordStatusChange).not.toHaveBeenCalled();
  });

  it('propagates when the ledger capture throws, rolling back the soft-close with it', async () => {
    registry.register(executor);
    vi.mocked(
      ruleApplicationsService.orphanUnmatchedApplications,
    ).mockResolvedValue({
      rowsOrphaned: 1,
      softClosedTasks: [
        { from: 'PENDING', planId, taskId: 'task-orphaned-1', to: 'SKIPPED' },
      ],
    });
    vi.mocked(workLedgerCapture.recordStatusChange).mockRejectedValueOnce(
      new Error(
        'Cannot record work-ledger status change: unresolved authentication principal.',
      ),
    );

    await expect(processor.process(buildJob())).rejects.toThrow(
      'unresolved authentication principal',
    );
  });

  it('an executor blocked by its own gating writes flagged via the ledger (contract shape)', async () => {
    const flaggingExecutor: ActionExecutor = {
      actionType: 'inject-task',
      execute: vi.fn(async ({ action, plan }) => {
        await ruleApplicationsService.record({
          details: { reason: 'skill-unavailable' },
          planId: plan.id,
          ruleId: action.ruleId,
          state: 'flagged',
        });
      }),
    };
    registry.register(flaggingExecutor);

    await processor.process(buildJob());

    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { reason: 'skill-unavailable' },
        state: 'flagged',
      }),
    );
  });

  it('skips when the plan is missing', async () => {
    plansFindOne.mockResolvedValue(null);

    const result = await processor.process(buildJob());

    expect(result.skipped).toBe('plan-missing');
  });

  it('skips when the plan author has no user row (no rules to evaluate)', async () => {
    vi.mocked(usersService.findByGithubUsername).mockResolvedValue(null);

    const result = await processor.process(buildJob());

    expect(result.skipped).toBe('no-owner');
  });
});
