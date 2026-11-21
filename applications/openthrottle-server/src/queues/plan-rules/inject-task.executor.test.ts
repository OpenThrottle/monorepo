/**
 * @description Unit tests for {@link InjectTaskExecutor.execute}: the
 * pre-satisfied / gating / inject / ledger contract, placement math against
 * UNIQUE (plan_id, sort_order), collision retry, template interpolation, and
 * the lost-fingerprint-race compensation.
 */

import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  RuleApplication,
  RuleApplicationsRepository,
  TagActionRule,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import { Task } from '@openthrottle/nestjs-repositories-server';
import type { RuleApplicationsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createRuleApplicationsRepositoryMock,
  createTasksRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { MatchedTagAction } from '@openthrottle/openthrottle-skills';
import type { DataSource } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account/status-change-system-account.service.ts';
import type { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture/work-ledger-capture.service.ts';
import type { NotificationsService } from '../../notifications/notifications.service.ts';
import type { PlanContextAvailabilityService } from '../../services/plan-context-availability/plan-context-availability.service.ts';
import { ActionExecutorRegistry } from './action-executor-registry/action-executor-registry.service.ts';
import { InjectTaskExecutor } from './inject-task.executor.ts';

const planId = '00000000-0000-4000-8000-000000000001';
const ruleId = '00000000-0000-4000-8000-000000000002';
const taskId = '00000000-0000-4000-8000-000000000003';
const ownerUserId = '00000000-0000-4000-8000-000000000004';

const buildPlan = (overrides: Partial<Plan> = {}): Plan => {
  return asMock<Plan>({
    id: planId,
    projectId: null,
    status: 'PENDING',
    title: 'My breakdown plan',
    ...overrides,
  });
};

const buildAction = (
  payload: Record<string, unknown> = { skillSlug: 'grilling' },
): MatchedTagAction => {
  return {
    actionPayload: payload,
    actionType: 'inject-task',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    matchedTags: ['breakdown'],
    ruleId,
    scope: {
      environment: null,
      repositoryId: null,
      status: null,
      tagAll: ['breakdown'],
    },
  };
};

const buildRule = (): TagActionRule => {
  return asMock<TagActionRule>({ id: ruleId });
};

const sortOrderViolation = (): QueryFailedError => {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate'), { code: '23505' }),
  );
};

describe('InjectTaskExecutor', () => {
  let executor: InjectTaskExecutor;
  let ruleApplicationsRepository: RuleApplicationsRepositoryMock;
  let isSkillUnavailableForPlan: Mock<
    PlanContextAvailabilityService['isSkillUnavailableForPlan']
  >;
  let preSatisfiedGetOne: ReturnType<typeof vi.fn>;
  let sortOrderLookup: ReturnType<typeof vi.fn>;
  let taskCreate: ReturnType<typeof vi.fn>;
  let taskRemove: ReturnType<typeof vi.fn>;
  let taskFindOne: ReturnType<typeof vi.fn>;
  let taskUpdate: ReturnType<typeof vi.fn>;
  let configGet: ReturnType<typeof vi.fn>;
  let listEdgePlacementSiblings: RuleApplicationsRepositoryMock['listEdgePlacementSiblings'];
  let managerUpdate: ReturnType<typeof vi.fn>;
  let emitTaskStatusChanged: Mock<
    NotificationsService['emitTaskStatusChanged']
  >;
  let resolveStatusChangeSystemAccountId: Mock<
    StatusChangeSystemAccountService['resolveId']
  >;
  let mockRecordStatusChange: Mock<
    WorkLedgerCaptureService['recordStatusChange']
  >;
  let allocateSortOrderBesideAnchor: Mock<
    TasksRepository['allocateSortOrderBesideAnchor']
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    preSatisfiedGetOne = vi.fn().mockResolvedValue(null);
    // MIN/MAX sort_order extent and the neighbour beside an anchor share one stub: a test sets
    // the single number (or null) the lookup it exercises should answer with.
    sortOrderLookup = vi.fn().mockResolvedValue(1000);

    taskCreate = vi.fn(async (data: Partial<Task>) => ({
      ...data,
      id: taskId,
    }));
    taskRemove = vi.fn().mockResolvedValue(undefined);
    taskFindOne = vi.fn().mockResolvedValue(null);
    taskUpdate = vi.fn().mockResolvedValue({ updateCount: 1 });
    // Transaction manager used by the multi-sibling group reconcile path.
    managerUpdate = vi.fn().mockResolvedValue({ affected: 1 });
    const dataSource = asMock<DataSource>({
      transaction: vi.fn(async (run: (manager: unknown) => Promise<void>) =>
        run(asMock({ update: managerUpdate })),
      ),
    });
    allocateSortOrderBesideAnchor = vi.fn().mockResolvedValue(1500);
    const tasksRepository = asMock<TasksRepository>({
      ...createTasksRepositoryMock(),
      allocateSortOrderBesideAnchor,
      create: taskCreate,
      findFirstByTitleContaining: preSatisfiedGetOne,
      findFirstMentioning: preSatisfiedGetOne,
      findOne: taskFindOne,
      getNeighborSortOrder: sortOrderLookup,
      getSortOrderExtent: sortOrderLookup,
      remove: taskRemove,
      updateMany: taskUpdate,
    });

    // Kill switch defaults to enabled (flag unset).
    configGet = vi.fn().mockReturnValue(undefined);
    const configService = asMock<ConfigService>({ get: configGet });

    isSkillUnavailableForPlan = vi.fn().mockResolvedValue(false);
    const planContextAvailabilityService =
      createMock<PlanContextAvailabilityService>({
        isSkillUnavailableForPlan,
      });

    // Same-placement sibling lookup; defaults to a single sibling (the task
    // under reconcile) so the common single-injected path is exercised.
    ruleApplicationsRepository = createRuleApplicationsRepositoryMock();
    listEdgePlacementSiblings =
      ruleApplicationsRepository.listEdgePlacementSiblings;
    listEdgePlacementSiblings.mockResolvedValue([{ sortOrder: 1000, taskId }]);

    resolveStatusChangeSystemAccountId = vi
      .fn()
      .mockResolvedValue('status-change-system-account-id');
    const statusChangeSystemAccount =
      createMock<StatusChangeSystemAccountService>({
        resolveId: resolveStatusChangeSystemAccountId,
      });

    mockRecordStatusChange = vi.fn().mockResolvedValue(undefined);
    const workLedgerCapture = createMock<WorkLedgerCaptureService>({
      recordStatusChange: mockRecordStatusChange,
    });

    emitTaskStatusChanged = vi.fn();

    executor = new InjectTaskExecutor(
      configService,
      dataSource,
      new ActionExecutorRegistry(createMock<LoggerService>()),
      createMock<LoggerService>(),
      createMock<NotificationsService>({ emitTaskStatusChanged }),
      planContextAvailabilityService,
      asMock<RuleApplicationsRepository>(ruleApplicationsRepository),
      statusChangeSystemAccount,
      tasksRepository,
      workLedgerCapture,
    );
  });

  it('ledgers pre-satisfied (with the task id) when a task already references /<slug> — any status', async () => {
    preSatisfiedGetOne.mockResolvedValue(
      asMock<Task>({ id: 'existing-task', status: 'COMPLETED' }),
    );

    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'pre-satisfied',
        taskId: 'existing-task',
      }),
    );
    expect(taskCreate).not.toHaveBeenCalled();
  });

  it('ledgers flagged {reason: skill-unavailable} when plan-context availability gates the slug', async () => {
    isSkillUnavailableForPlan.mockResolvedValue(true);

    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan({ projectId: 'project-1' }),
      rule: buildRule(),
    });

    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ reason: 'skill-unavailable' }),
        state: 'flagged',
      }),
    );
    expect(taskCreate).not.toHaveBeenCalled();
  });

  it('consults the gate with the plan id, slug, and owner vocabulary', async () => {
    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(isSkillUnavailableForPlan).toHaveBeenCalledWith(
      planId,
      'grilling',
      ownerUserId,
    );
  });

  it('injects at first position (MIN − 1000) with default title and provenance footer, then ledgers applied', async () => {
    sortOrderLookup.mockResolvedValue(1000);

    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        planId,
        sortOrder: 0,
        status: 'PENDING',
        title: 'Run /grilling (required by rule)',
      }),
    );
    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Injected by tag→action rule'),
      }),
    );
    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('breakdown'),
      }),
    );
    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'applied', taskId }),
    );
    // The new row is announced so an open plan view shows it without a reload.
    expect(emitTaskStatusChanged).toHaveBeenCalledWith({
      planId,
      status: 'PENDING',
      taskId,
    });
  });

  it('injects at last position (MAX + 1000) when placement is last', async () => {
    sortOrderLookup.mockResolvedValue(3000);

    await executor.execute({
      action: buildAction({ placement: 'last', skillSlug: 'grilling' }),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 4000 }),
    );
  });

  it('resolves a taskId anchor and delegates after-placement to the allocator', async () => {
    taskFindOne.mockResolvedValue(
      asMock<Task>({ id: 'anchor', sortOrder: 2000 }),
    );
    allocateSortOrderBesideAnchor.mockResolvedValue(2500);

    await executor.execute({
      action: buildAction({
        anchor: { taskId: '00000000-0000-4000-8000-000000000009' },
        placement: 'after',
        skillSlug: 'grilling',
      }),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(allocateSortOrderBesideAnchor).toHaveBeenCalledWith(
      planId,
      'anchor',
      'after',
    );
    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 2500 }),
    );
  });

  it('delegates before-placement to the allocator with the before side', async () => {
    taskFindOne.mockResolvedValue(
      asMock<Task>({ id: 'anchor', sortOrder: 2000 }),
    );
    allocateSortOrderBesideAnchor.mockResolvedValue(1500);

    await executor.execute({
      action: buildAction({
        anchor: { taskId: '00000000-0000-4000-8000-000000000009' },
        placement: 'before',
        skillSlug: 'grilling',
      }),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(allocateSortOrderBesideAnchor).toHaveBeenCalledWith(
      planId,
      'anchor',
      'before',
    );
    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 1500 }),
    );
  });

  it('resolves a skillSlug anchor (query builder) before delegating', async () => {
    // 1st getOne = pre-satisfied (none); 2nd getOne = anchor-by-slug resolution.
    preSatisfiedGetOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        asMock<Task>({ id: 'lint-task', sortOrder: 2000 }),
      );
    allocateSortOrderBesideAnchor.mockResolvedValue(2500);

    await executor.execute({
      action: buildAction({
        anchor: { skillSlug: 'lint' },
        placement: 'after',
        skillSlug: 'grilling',
      }),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(allocateSortOrderBesideAnchor).toHaveBeenCalledWith(
      planId,
      'lint-task',
      'after',
    );
  });

  it('starts at 1000 on an empty plan', async () => {
    sortOrderLookup.mockResolvedValue(null);

    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 1000 }),
    );
  });

  it('retries once with a recomputed sort order on a UNIQUE collision', async () => {
    sortOrderLookup.mockResolvedValueOnce(1000).mockResolvedValueOnce(0);
    taskCreate
      .mockRejectedValueOnce(sortOrderViolation())
      .mockImplementationOnce((entity: Task) =>
        Promise.resolve({ ...entity, id: taskId }),
      );

    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskCreate).toHaveBeenCalledTimes(2);
    expect(taskCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortOrder: -1000 }),
    );
    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'applied' }),
    );
  });

  it('interpolates title/description templates', async () => {
    await executor.execute({
      action: buildAction({
        descriptionTemplate: 'Tags: {{matchedTags}} on {{plan.id}}',
        skillSlug: 'grilling',
        titleTemplate: 'Grill {{plan.title}}',
      }),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Grill My breakdown plan' }),
    );
    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining(`Tags: breakdown on ${planId}`),
      }),
    );
  });

  it('deletes the duplicate task when the apply-once ledger race is lost', async () => {
    vi.mocked(ruleApplicationsRepository.record).mockResolvedValue(
      asMock<RuleApplication>({ state: 'applied', taskId: 'winner-task' }),
    );

    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskRemove).toHaveBeenCalledWith(taskId);
  });

  it('tolerates the duplicate task already being gone when the ledger race is lost', async () => {
    vi.mocked(ruleApplicationsRepository.record).mockResolvedValue(
      asMock<RuleApplication>({ state: 'applied', taskId: 'winner-task' }),
    );
    taskRemove.mockRejectedValue(new NotFoundException('already gone'));

    await expect(
      executor.execute({
        action: buildAction(),
        ownerUserId,
        plan: buildPlan(),
        rule: buildRule(),
      }),
    ).resolves.toBeUndefined();
  });

  describe('reconcile', () => {
    const buildReconcile = (
      payload: Record<string, unknown>,
      application: Partial<RuleApplication> = { taskId },
    ) => {
      return {
        action: buildAction(payload),
        application: asMock<RuleApplication>({
          state: 'applied',
          ...application,
        }),
        ownerUserId,
        plan: buildPlan(),
        rule: buildRule(),
      };
    };

    it("moves a 'last' task below a newer max back above it", async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 1000,
          status: 'PENDING',
        }),
      );
      sortOrderLookup.mockResolvedValue(5000); // MAX of other tasks

      await executor.reconcile(
        buildReconcile({ placement: 'last', skillSlug: 'grilling' }),
      );

      expect(taskUpdate).toHaveBeenCalledWith(
        { id: taskId },
        { sortOrder: 6000 },
      );
    });

    it("does not write when a 'last' task is already above the max (converged → no further churn)", async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 6000,
          status: 'PENDING',
        }),
      );
      sortOrderLookup.mockResolvedValue(5000);

      await executor.reconcile(
        buildReconcile({ placement: 'last', skillSlug: 'grilling' }),
      );

      expect(taskUpdate).not.toHaveBeenCalled();
    });

    it("moves a 'first' task above a newer min back below it", async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 3000,
          status: 'PENDING',
        }),
      );
      sortOrderLookup.mockResolvedValue(2000); // MIN of other tasks

      await executor.reconcile(
        buildReconcile({ placement: 'first', skillSlug: 'grilling' }),
      );

      expect(taskUpdate).toHaveBeenCalledWith(
        { id: taskId },
        { sortOrder: 1000 },
      );
    });

    it('is a no-op when the kill switch is disabled', async () => {
      configGet.mockReturnValue('false');

      await executor.reconcile(
        buildReconcile({ placement: 'last', skillSlug: 'grilling' }),
      );

      expect(taskFindOne).not.toHaveBeenCalled();
      expect(taskUpdate).not.toHaveBeenCalled();
    });

    it('is a no-op when the injected task was deleted (task_id NULL)', async () => {
      await executor.reconcile(
        buildReconcile(
          { placement: 'last', skillSlug: 'grilling' },
          { taskId: null },
        ),
      );

      expect(taskFindOne).not.toHaveBeenCalled();
      expect(taskUpdate).not.toHaveBeenCalled();
    });

    it.each(['CANCELED', 'COMPLETED', 'PROMOTED', 'SKIPPED'])(
      'is a no-op for a task in the terminal status %s',
      async (status) => {
        taskFindOne.mockResolvedValue(
          asMock<Task>({
            id: taskId,
            planId,
            sortOrder: 1000,
            status,
          }),
        );

        await executor.reconcile(
          buildReconcile({ placement: 'last', skillSlug: 'grilling' }),
        );

        expect(taskUpdate).not.toHaveBeenCalled();
      },
    );

    it("orders two 'last' siblings deterministically at base+GAP, base+2·GAP", async () => {
      const siblingA = '00000000-0000-4000-8000-0000000000aa';
      const siblingB = '00000000-0000-4000-8000-0000000000bb';
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 1000,
          status: 'PENDING',
        }),
      );
      // Two 'last' siblings in tiebreak order, both currently below the target band.
      listEdgePlacementSiblings.mockResolvedValue([
        { sortOrder: 1000, taskId: siblingA },
        { sortOrder: 2000, taskId: siblingB },
      ]);
      sortOrderLookup.mockResolvedValue(5000); // MAX excluding siblings

      await executor.reconcile(
        buildReconcile({ placement: 'last', skillSlug: 'grilling' }),
      );

      // Deterministic slots: rank 0 → 6000, rank 1 → 7000, set inside the tx.
      expect(managerUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { id: siblingA },
        { sortOrder: 6000 },
      );
      expect(managerUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { id: siblingB },
        { sortOrder: 7000 },
      );
    });

    it('does not re-write two siblings already at their deterministic slots (no thrash)', async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 6000,
          status: 'PENDING',
        }),
      );
      listEdgePlacementSiblings.mockResolvedValue([
        { sortOrder: 6000, taskId: '00000000-0000-4000-8000-0000000000aa' },
        { sortOrder: 7000, taskId: '00000000-0000-4000-8000-0000000000bb' },
      ]);
      sortOrderLookup.mockResolvedValue(5000);

      await executor.reconcile(
        buildReconcile({ placement: 'last', skillSlug: 'grilling' }),
      );

      expect(managerUpdate).not.toHaveBeenCalled();
    });

    it('retries the reposition once when a concurrent write took the slot (human reorder race)', async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 1000,
          status: 'PENDING',
        }),
      );
      sortOrderLookup.mockResolvedValue(5000);
      // First update loses the UNIQUE(plan_id, sort_order) race; retry succeeds.
      taskUpdate
        .mockRejectedValueOnce(sortOrderViolation())
        .mockResolvedValueOnce({ updateCount: 1 });

      await executor.reconcile(
        buildReconcile({ placement: 'last', skillSlug: 'grilling' }),
      );

      expect(taskUpdate).toHaveBeenCalledTimes(2);
      expect(taskUpdate).toHaveBeenLastCalledWith(
        { id: taskId },
        { sortOrder: 6000 },
      );
    });

    it("orders two 'first' siblings deterministically below the min (base − n·GAP)", async () => {
      const siblingA = '00000000-0000-4000-8000-0000000000aa';
      const siblingB = '00000000-0000-4000-8000-0000000000bb';
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 9000,
          status: 'PENDING',
        }),
      );
      listEdgePlacementSiblings.mockResolvedValue([
        { sortOrder: 9000, taskId: siblingA },
        { sortOrder: 9500, taskId: siblingB },
      ]);
      sortOrderLookup.mockResolvedValue(5000); // MIN excluding siblings

      await executor.reconcile(
        buildReconcile({ placement: 'first', skillSlug: 'grilling' }),
      );

      // rank 0 → 5000 − 2·1000 = 3000, rank 1 → 5000 − 1·1000 = 4000.
      expect(managerUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { id: siblingA },
        { sortOrder: 3000 },
      );
      expect(managerUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { id: siblingB },
        { sortOrder: 4000 },
      );
    });

    it("re-allocates an out-of-position 'after' task beside its anchor", async () => {
      taskFindOne
        .mockResolvedValueOnce(
          asMock<Task>({
            id: taskId,
            planId,
            sortOrder: 500,
            status: 'PENDING',
          }),
        ) // the injected task under reconcile
        .mockResolvedValueOnce(
          asMock<Task>({
            id: '00000000-0000-4000-8000-0000000000cc',
            planId,
            sortOrder: 1000,
          }),
        ); // the resolved anchor
      sortOrderLookup.mockResolvedValue(null); // no task between anchor and self

      await executor.reconcile({
        action: buildAction({
          anchor: { taskId: '00000000-0000-4000-8000-0000000000cc' },
          placement: 'after',
          skillSlug: 'grilling',
        }),
        application: asMock<RuleApplication>({ state: 'applied', taskId }),
        ownerUserId,
        plan: buildPlan(),
        rule: buildRule(),
      });

      expect(allocateSortOrderBesideAnchor).toHaveBeenCalledWith(
        planId,
        '00000000-0000-4000-8000-0000000000cc',
        'after',
      );
      expect(taskUpdate).toHaveBeenCalledWith(
        { id: taskId },
        { sortOrder: 1500 },
      );
    });

    it("leaves an already-adjacent 'after' task in place", async () => {
      taskFindOne
        .mockResolvedValueOnce(
          asMock<Task>({
            id: taskId,
            planId,
            sortOrder: 2000,
            status: 'PENDING',
          }),
        )
        .mockResolvedValueOnce(
          asMock<Task>({
            id: '00000000-0000-4000-8000-0000000000cc',
            planId,
            sortOrder: 1000,
          }),
        );
      sortOrderLookup.mockResolvedValue(null); // no other task after the anchor

      await executor.reconcile({
        action: buildAction({
          anchor: { taskId: '00000000-0000-4000-8000-0000000000cc' },
          placement: 'after',
          skillSlug: 'grilling',
        }),
        application: asMock<RuleApplication>({ state: 'applied', taskId }),
        ownerUserId,
        plan: buildPlan(),
        rule: buildRule(),
      });

      expect(allocateSortOrderBesideAnchor).not.toHaveBeenCalled();
      expect(taskUpdate).not.toHaveBeenCalled();
    });
  });

  describe('reinject', () => {
    const buildReinject = (application: Partial<RuleApplication>) => {
      return {
        action: buildAction({ placement: 'first', skillSlug: 'grilling' }),
        application: asMock<RuleApplication>(application),
        ownerUserId,
        plan: buildPlan(),
        rule: buildRule(),
      };
    };

    it('re-injects a fresh task for a delete-to-reset row (applied, task_id NULL)', async () => {
      await executor.reinject(
        buildReinject({ state: 'applied', taskId: null }),
      );

      expect(taskCreate).toHaveBeenCalled();
      expect(ruleApplicationsRepository.upsertApplication).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'applied' }),
      );
    });

    it('revives (reopens) the soft-closed task for an orphaned row that matches again, capturing a status_change', async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({ id: 'old-task', planId, status: 'SKIPPED' }),
      );

      await executor.reinject(
        buildReinject({ state: 'orphaned', taskId: 'old-task' }),
      );

      // The revive runs the update + capture inside its own manager.transaction (background
      // writer, no request principal — see reviveSoftClosedTask's doc comment), so the row write
      // lands via managerUpdate rather than the bare tasksRepository.updateMany used by the reconcile paths.
      expect(managerUpdate).toHaveBeenCalledWith(
        Task,
        { id: 'old-task' },
        { status: 'PENDING' },
      );
      expect(taskCreate).not.toHaveBeenCalled();
      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorKind: 'service_account',
          actorSub: 'status-change-system-account-id',
          entity: 'task',
          from: 'SKIPPED',
          planId,
          taskId: 'old-task',
          to: 'PENDING',
        }),
      );
      expect(ruleApplicationsRepository.upsertApplication).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'applied', taskId: 'old-task' }),
      );
      expect(emitTaskStatusChanged).toHaveBeenCalledWith({
        planId,
        status: 'PENDING',
        taskId: 'old-task',
      });
    });

    it('does not reopen an orphaned task that is already active', async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({ id: 'old-task', planId, status: 'PENDING' }),
      );

      await executor.reinject(
        buildReinject({ state: 'orphaned', taskId: 'old-task' }),
      );

      expect(taskUpdate).not.toHaveBeenCalled();
      expect(ruleApplicationsRepository.upsertApplication).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'applied', taskId: 'old-task' }),
      );
    });
  });
});
