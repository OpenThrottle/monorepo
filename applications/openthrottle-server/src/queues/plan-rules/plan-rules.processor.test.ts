/**
 * @description Unit tests for {@link PlanRulesProcessor.process}: the shared
 * executor-contract behavior (fingerprint no-op on duplicate delivery, skip
 * without ledger row when no executor is registered, orphan flip on un-match)
 * and dispatch wiring.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  OrphanedTaskStatusCaptureParams,
  Plan,
  PlansRepository,
  RuleApplication,
  RuleApplicationsRepository,
  TagActionRule,
  TagActionRulesRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  RuleApplicationsRepositoryMock,
  TagActionRulesRepositoryMock,
  UsersRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlansRepositoryMock,
  createRuleApplicationsRepositoryMock,
  createTagActionRulesRepositoryMock,
  createUsersRepositoryMock,
  usersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account/status-change-system-account.service.ts';
import type { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture/work-ledger-capture.service.ts';
import type { NotificationsService } from '../../notifications/notifications.service.ts';
import type { TagsService } from '../../services/tags/tags.service.ts';
import { ActionExecutorRegistry } from './action-executor-registry/action-executor-registry.service.ts';
import type { ActionExecutor } from './action-executor-registry/action-executor-registry.types.ts';
import { PlanRulesProcessor } from './plan-rules.processor.ts';
import type {
  PlanRulesEnvironment,
  PlanRulesEvaluateJob,
} from './plan-rules.types.ts';

const planId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';

const buildJob = (
  environment: PlanRulesEnvironment = null,
): PlanRulesEvaluateJob => {
  return asMock<PlanRulesEvaluateJob>({
    data: { environment, planId, triggerKind: 'tag-changed' },
  });
};

const buildPlan = (): Plan => {
  return asMock<Plan>({
    author: 'visormatt',
    id: planId,
    projectId: null,
    status: 'PENDING',
  });
};

const buildRule = (overrides: Partial<TagActionRule> = {}): TagActionRule => {
  return asMock<TagActionRule>({
    actionPayload: { placement: 'first', skillSlug: 'grilling' },
    actionType: 'inject-task',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    enabled: true,
    environment: null,
    id: 'rule-1',
    projectId: null,
    repositoryId: null,
    status: null,
    tagAll: ['breakdown'],
    userId,
    ...overrides,
  });
};

describe('PlanRulesProcessor.process', () => {
  let processor: PlanRulesProcessor;
  let registry: ActionExecutorRegistry;
  let executor: ActionExecutor;
  let plansFindOne: ReturnType<typeof vi.fn>;
  let ruleApplicationsRepository: RuleApplicationsRepositoryMock;
  let tagActionRulesRepository: TagActionRulesRepositoryMock;
  let tagsService: TagsService;
  let users: UsersRepositoryMock;
  let mockRecordStatusChange: Mock<
    WorkLedgerCaptureService['recordStatusChange']
  >;
  let resolveStatusChangeSystemAccountId: Mock<
    StatusChangeSystemAccountService['resolveId']
  >;
  let emitTaskStatusChanged: Mock<
    NotificationsService['emitTaskStatusChanged']
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ActionExecutorRegistry(createMock<LoggerService>());
    executor = { actionType: 'inject-task', execute: vi.fn() };

    plansFindOne = vi.fn().mockResolvedValue(buildPlan());
    const plansRepository = asMock<PlansRepository>({
      ...createPlansRepositoryMock(),
      findOne: plansFindOne,
    });

    users = createUsersRepositoryMock();
    users.findByGithubUsername.mockResolvedValue(
      usersFactory.build({ id: userId }),
    );
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
    tagActionRulesRepository = createTagActionRulesRepositoryMock();
    tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
      buildRule(),
    ]);
    ruleApplicationsRepository = createRuleApplicationsRepositoryMock();

    mockRecordStatusChange = vi.fn().mockResolvedValue(undefined);
    resolveStatusChangeSystemAccountId = vi
      .fn()
      .mockResolvedValue('status-change-system-account-id');

    emitTaskStatusChanged = vi.fn();

    processor = new PlanRulesProcessor(
      registry,
      createMock<LoggerService>(),
      createMock<NotificationsService>({ emitTaskStatusChanged }),
      plansRepository,
      asMock<RuleApplicationsRepository>(ruleApplicationsRepository),
      createMock<StatusChangeSystemAccountService>({
        resolveId: resolveStatusChangeSystemAccountId,
      }),
      asMock<TagActionRulesRepository>(tagActionRulesRepository),
      tagsService,
      createMock<UsersRepository>(users),
      createMock<WorkLedgerCaptureService>({
        recordStatusChange: mockRecordStatusChange,
      }),
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

  describe('environment-qualified rules', () => {
    beforeEach(() => {
      registry.register(executor);
      tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
        buildRule({ environment: 'ralph' }),
      ]);
    });

    it('matches when the job carries that environment', async () => {
      const result = await processor.process(buildJob('ralph'));

      expect(result.matched).toBe(1);
      expect(executor.execute).toHaveBeenCalledTimes(1);
    });

    it('does not match when the job environment is null', async () => {
      const result = await processor.process(buildJob(null));

      expect(result.matched).toBe(0);
      expect(executor.execute).not.toHaveBeenCalled();
    });

    it('does not match a different environment', async () => {
      const result = await processor.process(buildJob('ci'));

      expect(result.matched).toBe(0);
      expect(executor.execute).not.toHaveBeenCalled();
    });
    it("a pass in another environment leaves the rule's ledger row alone", async () => {
      await processor.process(buildJob(null));
      await processor.process(buildJob('ci'));

      // Never evaluated in those passes, so never orphaned by them: a null or ci pass
      // overlapping a ralph pass must not soft-close what the ralph pass injected.
      for (const call of vi.mocked(
        ruleApplicationsRepository.orphanUnmatchedApplications,
      ).mock.calls) {
        expect(call[1]).toEqual(['rule-1']);
      }
    });

    it("orphans an unmatched rule of the pass's own environment", async () => {
      tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
        buildRule({ environment: 'ralph', tagAll: ['not-on-the-plan'] }),
      ]);

      await processor.process(buildJob('ralph'));

      expect(
        ruleApplicationsRepository.orphanUnmatchedApplications,
      ).toHaveBeenCalledWith(planId, [], expect.any(Function));
    });
  });

  it('no-ops on duplicate delivery: an existing ledger row in ANY state blocks dispatch', async () => {
    registry.register(executor);
    vi.mocked(ruleApplicationsRepository.findByRuleAndPlan).mockResolvedValue(
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
    vi.mocked(ruleApplicationsRepository.findByRuleAndPlan).mockResolvedValue(
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
    vi.mocked(ruleApplicationsRepository.findByRuleAndPlan).mockResolvedValue(
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
    vi.mocked(ruleApplicationsRepository.findByRuleAndPlan).mockResolvedValue(
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
    vi.mocked(ruleApplicationsRepository.findByRuleAndPlan).mockResolvedValue(
      asMock<RuleApplication>({ state: 'orphaned', taskId: 'old-task' }),
    );

    const result = await processor.process(buildJob());

    expect(reinjectingExecutor.reinject).toHaveBeenCalledTimes(1);
    expect(reinjectingExecutor.execute).not.toHaveBeenCalled();
    expect(result.reinjected).toBe(1);
  });

  describe('inject-task supersede arbitration', () => {
    const repositoryId = '00000000-0000-4000-8000-0000000000aa';
    const broad = buildRule({ id: 'rule-broad' });
    const narrow = buildRule({ id: 'rule-narrow', repositoryId });

    beforeEach(() => {
      plansFindOne.mockResolvedValue(
        asMock<Plan>({ ...buildPlan(), repositoryId }),
      );
      registry.register(executor);
    });

    it('dispatches only the narrowest and flags the loser as superseded-by', async () => {
      tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
        broad,
        narrow,
      ]);

      const result = await processor.process(buildJob());

      expect(executor.execute).toHaveBeenCalledTimes(1);
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.objectContaining({ ruleId: 'rule-narrow' }),
        }),
      );
      expect(ruleApplicationsRepository.record).toHaveBeenCalledTimes(1);
      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith({
        details: { reason: 'superseded-by', ruleId: 'rule-narrow' },
        planId,
        ruleId: 'rule-broad',
        state: 'flagged',
      });
      expect(result.dispatched).toBe(1);
      expect(result.matched).toBe(2);
    });

    it('still supersedes a fresh broader rule when the narrow winner is already applied', async () => {
      tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
        broad,
        narrow,
      ]);
      vi.mocked(
        ruleApplicationsRepository.findByRuleAndPlan,
      ).mockImplementation(async (ruleId) => {
        return ruleId === 'rule-narrow'
          ? asMock<RuleApplication>({ state: 'applied', taskId: 'task-1' })
          : null;
      });

      await processor.process(buildJob());

      expect(executor.execute).not.toHaveBeenCalled();
      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { reason: 'superseded-by', ruleId: 'rule-narrow' },
          ruleId: 'rule-broad',
          state: 'flagged',
        }),
      );
    });

    it('writes no flagged row when the loser already has a ledger row', async () => {
      tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
        broad,
        narrow,
      ]);
      vi.mocked(
        ruleApplicationsRepository.findByRuleAndPlan,
      ).mockImplementation(async (ruleId) => {
        return ruleId === 'rule-broad'
          ? asMock<RuleApplication>({ state: 'flagged' })
          : null;
      });

      await processor.process(buildJob());

      expect(ruleApplicationsRepository.record).not.toHaveBeenCalled();
      expect(executor.execute).toHaveBeenCalledTimes(1);
    });

    it('dispatches both when the placement differs', async () => {
      tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
        buildRule({
          actionPayload: { placement: 'last', skillSlug: 'grilling' },
          id: 'rule-broad',
        }),
        narrow,
      ]);

      await processor.process(buildJob());

      expect(executor.execute).toHaveBeenCalledTimes(2);
      expect(ruleApplicationsRepository.record).not.toHaveBeenCalled();
    });

    it('dispatches both when the skill differs', async () => {
      tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
        buildRule({
          actionPayload: { placement: 'first', skillSlug: 'other-skill' },
          id: 'rule-broad',
        }),
        narrow,
      ]);

      await processor.process(buildJob());

      expect(executor.execute).toHaveBeenCalledTimes(2);
    });

    it('treats before/after placements with different anchors as distinct', async () => {
      const anchored = (
        id: string,
        titleMatch: string,
        scopedRepositoryId: string | null,
      ): TagActionRule => {
        return buildRule({
          actionPayload: {
            anchor: { titleMatch },
            placement: 'after',
            skillSlug: 'grilling',
          },
          id,
          repositoryId: scopedRepositoryId,
        });
      };
      tagActionRulesRepository.listEnabledForUser.mockResolvedValue([
        anchored('rule-a', 'one', null),
        anchored('rule-b', 'two', repositoryId),
      ]);

      await processor.process(buildJob());

      expect(executor.execute).toHaveBeenCalledTimes(2);
    });
  });

  it('skips a matched action with no registered executor WITHOUT writing a ledger row', async () => {
    const result = await processor.process(buildJob());

    expect(ruleApplicationsRepository.record).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(0);
    expect(result.matched).toBe(1);
  });

  it('flips un-matched applied rows to orphaned (matched rule ids are exempt)', async () => {
    registry.register(executor);
    vi.mocked(
      ruleApplicationsRepository.orphanUnmatchedApplications,
    ).mockResolvedValue(2);

    const result = await processor.process(buildJob());

    expect(
      ruleApplicationsRepository.orphanUnmatchedApplications,
    ).toHaveBeenCalledWith(planId, ['rule-1'], expect.any(Function));
    expect(result.orphaned).toBe(2);
  });

  it('captures a status_change (system account, non-fatal) for each task orphanUnmatchedApplications soft-closes', async () => {
    registry.register(executor);
    const manager = asMock<OrphanedTaskStatusCaptureParams['manager']>({});
    vi.mocked(
      ruleApplicationsRepository.orphanUnmatchedApplications,
    ).mockImplementation(
      async (_planId, _matchedRuleIds, captureOrphanedTaskStatusChange) => {
        await captureOrphanedTaskStatusChange?.({
          fromStatus: 'PENDING',
          manager,
          planId,
          taskId: 'orphaned-task-1',
        });
        return 1;
      },
    );

    await processor.process(buildJob());

    expect(mockRecordStatusChange).toHaveBeenCalledWith(manager, {
      actorKind: 'service_account',
      actorSub: 'status-change-system-account-id',
      entity: 'task',
      from: 'PENDING',
      id: 'orphaned-task-1',
      planId,
      taskId: 'orphaned-task-1',
      to: 'SKIPPED',
    });
    // Published once the orphaning transaction has returned, never from inside it.
    expect(emitTaskStatusChanged).toHaveBeenCalledWith({
      planId,
      status: 'SKIPPED',
      taskId: 'orphaned-task-1',
    });
  });

  it('publishes nothing when no task was soft-closed', async () => {
    registry.register(executor);

    await processor.process(buildJob());

    expect(emitTaskStatusChanged).not.toHaveBeenCalled();
  });

  it('logs (does not throw) when the orphaned-task capture fails — non-fatal', async () => {
    registry.register(executor);
    mockRecordStatusChange.mockRejectedValueOnce(new Error('ledger down'));
    const manager = asMock<OrphanedTaskStatusCaptureParams['manager']>({});
    vi.mocked(
      ruleApplicationsRepository.orphanUnmatchedApplications,
    ).mockImplementation(
      async (_planId, _matchedRuleIds, captureOrphanedTaskStatusChange) => {
        await captureOrphanedTaskStatusChange?.({
          fromStatus: 'PENDING',
          manager,
          planId,
          taskId: 'orphaned-task-1',
        });
        return 1;
      },
    );

    await expect(processor.process(buildJob())).resolves.toBeDefined();
  });

  it('an executor blocked by its own gating writes flagged via the ledger (contract shape)', async () => {
    const flaggingExecutor: ActionExecutor = {
      actionType: 'inject-task',
      execute: vi.fn(async ({ action, plan }) => {
        await ruleApplicationsRepository.record({
          details: { reason: 'skill-unavailable' },
          planId: plan.id,
          ruleId: action.ruleId,
          state: 'flagged',
        });
      }),
    };
    registry.register(flaggingExecutor);

    await processor.process(buildJob());

    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
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
    users.findByGithubUsername.mockResolvedValue(null);

    const result = await processor.process(buildJob());

    expect(result.skipped).toBe('no-owner');
  });
});
