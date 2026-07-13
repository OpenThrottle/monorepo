/**
 * @description Unit tests for {@link InjectTaskExecutor.execute}: the
 * pre-satisfied / gating / inject / ledger contract, placement math against
 * UNIQUE (plan_id, sort_order), collision retry, template interpolation, and
 * the lost-fingerprint-race compensation.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  ProjectSkill,
  ProjectSkillsService,
  RuleApplication,
  RuleApplicationsService,
  TagActionRule,
  Task,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { MatchedTagAction } from '@openthrottle/openthrottle-skills';
import { asMock } from '@openthrottle/nestjs-testing';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionExecutorRegistry } from './action-executor';
import { InjectTaskExecutor } from './inject-task.executor';

const planId = '00000000-0000-4000-8000-000000000001';
const ruleId = '00000000-0000-4000-8000-000000000002';
const taskId = '00000000-0000-4000-8000-000000000003';

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
  let projectSkillFindOne: ReturnType<typeof vi.fn>;
  let preSatisfiedGetOne: ReturnType<typeof vi.fn>;
  let aggregateGetRawOne: ReturnType<typeof vi.fn>;
  let taskSave: ReturnType<typeof vi.fn>;
  let taskCreate: ReturnType<typeof vi.fn>;
  let taskDelete: ReturnType<typeof vi.fn>;

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
    const tasksService = createMock<TasksService>({
      getRepository: vi.fn(() =>
        asMock({
          create: taskCreate,
          createQueryBuilder: vi.fn(() => queryBuilder),
          delete: taskDelete,
          save: taskSave,
        }),
      ),
    });

    projectSkillFindOne = vi.fn().mockResolvedValue(null);
    const projectSkillsService = createMock<ProjectSkillsService>({
      getRepository: vi.fn(() => asMock({ findOne: projectSkillFindOne })),
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
      new ActionExecutorRegistry(createMock<LoggerService>()),
      createMock<LoggerService>(),
      projectSkillsService,
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

  it('ledgers flagged {reason: skill-unavailable} when the plan project lacks the skill', async () => {
    projectSkillFindOne.mockResolvedValue(null);

    await executor.execute({
      action: buildAction(),
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

  it('ledgers flagged when the project skill is disable_model_invocation', async () => {
    projectSkillFindOne.mockResolvedValue(
      asMock<ProjectSkill>({ disableModelInvocation: true, slug: 'grilling' }),
    );

    await executor.execute({
      action: buildAction(),
      plan: buildPlan({ projectId: 'project-1' }),
      rule: buildRule(),
    });

    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'flagged' }),
    );
  });

  it('injects at first position (MIN − 1000) with default title and provenance footer, then ledgers applied', async () => {
    aggregateGetRawOne.mockResolvedValue({ value: '1000' });

    await executor.execute({
      action: buildAction(),
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
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 4000 }),
    );
  });

  it('starts at 1000 on an empty plan', async () => {
    aggregateGetRawOne.mockResolvedValue({ value: null });

    await executor.execute({
      action: buildAction(),
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
      plan: buildPlan(),
      rule: buildRule(),
    });

    expect(taskDelete).toHaveBeenCalledWith({ id: taskId });
  });
});
