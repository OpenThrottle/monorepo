/**
 * @description Unit tests for {@link InjectTaskExecutor.execute}: the
 * pre-satisfied / gating / inject / ledger contract, placement math against
 * UNIQUE (plan_id, sort_order), collision retry, template interpolation, and
 * the lost-fingerprint-race compensation.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { ConfigService } from '@nestjs/config';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  RuleApplication,
  RuleApplicationsService,
  TagActionRule,
  Task,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { MatchedTagAction } from '@openthrottle/openthrottle-skills';
import { asMock } from '@openthrottle/nestjs-testing';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { PlanContextAvailabilityService } from '../../services/plan-context-availability/plan-context-availability.service';
import { ActionExecutorRegistry } from './action-executor';
import { InjectTaskExecutor } from './inject-task.executor';

const planId = '00000000-0000-4000-8000-000000000001';
const ruleId = '00000000-0000-4000-8000-000000000002';
const taskId = '00000000-0000-4000-8000-000000000003';
const ownerUserId = '00000000-0000-4000-8000-000000000004';

const buildPlan = (overrides: Partial<Plan> = {}): Plan =>
  asMock<Plan>({
    id: planId,
    projectId: null,
    status: 'PENDING',
    title: 'My breakdown plan',
    ...overrides,
  });

const buildAction = (
  payload: Record<string, unknown> = { skillSlug: 'grilling' },
): MatchedTagAction => ({
  actionPayload: payload,
  actionType: 'inject-task',
  matchedTags: ['breakdown'],
  ruleId,
});

const buildRule = (): TagActionRule => asMock<TagActionRule>({ id: ruleId });

const sortOrderViolation = (): QueryFailedError =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate'), { code: '23505' }),
  );

describe('InjectTaskExecutor', () => {
  let executor: InjectTaskExecutor;
  let ruleApplicationsService: RuleApplicationsService;
  let isSkillUnavailableForPlan: Mock<
    PlanContextAvailabilityService['isSkillUnavailableForPlan']
  >;
  let preSatisfiedGetOne: ReturnType<typeof vi.fn>;
  let aggregateGetRawOne: ReturnType<typeof vi.fn>;
  let taskSave: ReturnType<typeof vi.fn>;
  let taskCreate: ReturnType<typeof vi.fn>;
  let taskDelete: ReturnType<typeof vi.fn>;
  let taskFindOne: ReturnType<typeof vi.fn>;
  let taskUpdate: ReturnType<typeof vi.fn>;
  let configGet: ReturnType<typeof vi.fn>;
  let allocateSortOrderBesideAnchor: Mock<
    TasksService['allocateSortOrderBesideAnchor']
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    preSatisfiedGetOne = vi.fn().mockResolvedValue(null);
    aggregateGetRawOne = vi.fn().mockResolvedValue({ value: '1000' });
    const queryBuilder = {
      andWhere: vi.fn(),
      getOne: preSatisfiedGetOne,
      getRawOne: aggregateGetRawOne,
      orderBy: vi.fn(),
      select: vi.fn(),
      where: vi.fn(),
    };
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);

    taskCreate = vi.fn((data: Partial<Task>) => ({ ...data }));
    taskSave = vi.fn((entity: Task) =>
      Promise.resolve({ ...entity, id: taskId }),
    );
    taskDelete = vi.fn();
    taskFindOne = vi.fn().mockResolvedValue(null);
    taskUpdate = vi.fn().mockResolvedValue({ affected: 1 });
    allocateSortOrderBesideAnchor = vi.fn().mockResolvedValue(1500);
    const tasksService = createMock<TasksService>({
      allocateSortOrderBesideAnchor,
      getRepository: vi.fn(() =>
        asMock({
          create: taskCreate,
          createQueryBuilder: vi.fn(() => queryBuilder),
          delete: taskDelete,
          findOne: taskFindOne,
          save: taskSave,
          update: taskUpdate,
        }),
      ),
    });

    // Kill switch defaults to enabled (flag unset).
    configGet = vi.fn().mockReturnValue(undefined);
    const configService = asMock<ConfigService>({ get: configGet });

    isSkillUnavailableForPlan = vi.fn().mockResolvedValue(false);
    const planContextAvailabilityService =
      createMock<PlanContextAvailabilityService>({
        isSkillUnavailableForPlan,
      });

    ruleApplicationsService = createMock<RuleApplicationsService>({
      record: vi.fn((input) =>
        Promise.resolve(
          asMock<RuleApplication>({
            planId: input.planId,
            ruleId: input.ruleId,
            state: input.state,
            taskId: input.taskId ?? null,
          }),
        ),
      ),
    });

    executor = new InjectTaskExecutor(
      configService,
      new ActionExecutorRegistry(createMock<LoggerService>()),
      createMock<LoggerService>(),
      planContextAvailabilityService,
      ruleApplicationsService,
      tasksService,
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

    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'pre-satisfied',
        taskId: 'existing-task',
      }),
    );
    expect(taskSave).not.toHaveBeenCalled();
  });

  it('ledgers flagged {reason: skill-unavailable} when plan-context availability gates the slug', async () => {
    isSkillUnavailableForPlan.mockResolvedValue(true);

    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan({ projectId: 'project-1' }),
      rule: buildRule(),
    });

    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ reason: 'skill-unavailable' }),
        state: 'flagged',
      }),
    );
    expect(taskSave).not.toHaveBeenCalled();
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
    aggregateGetRawOne.mockResolvedValue({ value: '1000' });

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
    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'applied', taskId }),
    );
  });

  it('injects at last position (MAX + 1000) when placement is last', async () => {
    aggregateGetRawOne.mockResolvedValue({ value: '3000' });

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
    aggregateGetRawOne.mockResolvedValue({ value: null });

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
    aggregateGetRawOne
      .mockResolvedValueOnce({ value: '1000' })
      .mockResolvedValueOnce({ value: '0' });
    taskSave
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

    expect(taskSave).toHaveBeenCalledTimes(2);
    expect(taskCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortOrder: -1000 }),
    );
    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
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
    vi.mocked(ruleApplicationsService.record).mockResolvedValue(
      asMock<RuleApplication>({ state: 'applied', taskId: 'winner-task' }),
    );

    await executor.execute({
      action: buildAction(),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskDelete).toHaveBeenCalledWith({ id: taskId });
  });

  describe('reconcile', () => {
    const buildReconcile = (
      payload: Record<string, unknown>,
      application: Partial<RuleApplication> = { taskId },
    ) => ({
      action: buildAction(payload),
      application: asMock<RuleApplication>({
        state: 'applied',
        ...application,
      }),
      ownerUserId,
      plan: buildPlan(),
      rule: buildRule(),
    });

    it("moves a 'last' task below a newer max back above it", async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 1000,
          status: 'PENDING',
        }),
      );
      aggregateGetRawOne.mockResolvedValue({ value: '5000' }); // MAX of other tasks

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
      aggregateGetRawOne.mockResolvedValue({ value: '5000' });

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
      aggregateGetRawOne.mockResolvedValue({ value: '2000' }); // MIN of other tasks

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

    it('is a no-op for a task in a terminal status', async () => {
      taskFindOne.mockResolvedValue(
        asMock<Task>({
          id: taskId,
          planId,
          sortOrder: 1000,
          status: 'COMPLETED',
        }),
      );

      await executor.reconcile(
        buildReconcile({ placement: 'last', skillSlug: 'grilling' }),
      );

      expect(taskUpdate).not.toHaveBeenCalled();
    });
  });
});
