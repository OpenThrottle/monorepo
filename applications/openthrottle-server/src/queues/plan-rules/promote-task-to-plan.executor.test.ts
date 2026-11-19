/**
 * @description Unit tests for {@link PromoteTaskToPlanExecutor}: resolving plan
 * tasks that carry the rule's matched tags, delegating each to the shared
 * TaskPromotionService, skipping already-promoted tasks, and recording the
 * ledger outcome (applied with promoted ids, or flagged when nothing matched).
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  RuleApplicationsRepository,
  TagActionRule,
  Task,
  TasksRepository,
  TaskTagsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { RuleApplicationsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createRuleApplicationsRepositoryMock,
  createTasksRepositoryMock,
  createTaskTagsRepositoryMock,
  taskTagsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { MatchedTagAction } from '@openthrottle/openthrottle-skills';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaskPromotionService } from '../task-promotion/task-promotion.service.ts';
import { ActionExecutorRegistry } from './action-executor-registry/action-executor-registry.service.ts';
import type { ActionExecutorContext } from './action-executor-registry/action-executor-registry.types.ts';
import { PromoteTaskToPlanExecutor } from './promote-task-to-plan.executor.ts';

const PLAN_ID = '00000000-0000-4000-8000-0000000000a1';
const OWNER_ID = '00000000-0000-4000-8000-0000000000b2';

describe('PromoteTaskToPlanExecutor', () => {
  let executor: PromoteTaskToPlanExecutor;
  let ruleApplicationsRepository: RuleApplicationsRepositoryMock;
  let taskTagsRepository: ReturnType<typeof createTaskTagsRepositoryMock>;
  let tasksRepository: TasksRepository;
  let taskPromotionService: TaskPromotionService;
  let taskFindOne: ReturnType<typeof vi.fn>;

  const buildContext = (): ActionExecutorContext => {
    return {
      action: asMock<MatchedTagAction>({
        actionPayload: {},
        actionType: 'promote-task-to-plan',
        matchedTags: ['promote'],
        ruleId: 'rule-1',
      }),
      ownerUserId: OWNER_ID,
      plan: asMock<Plan>({ id: PLAN_ID }),
      rule: asMock<TagActionRule>({ id: 'rule-1' }),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    taskTagsRepository = createTaskTagsRepositoryMock();
    taskTagsRepository.listTaskIdsByPlanAndTags.mockResolvedValue(['task-1']);

    taskFindOne = vi
      .fn()
      .mockResolvedValue(asMock<Task>({ id: 'task-1', status: 'PENDING' }));
    tasksRepository = asMock<TasksRepository>({
      ...createTasksRepositoryMock(),
      findOne: taskFindOne,
    });

    taskPromotionService = createMock<TaskPromotionService>({
      promote: vi
        .fn()
        .mockResolvedValue({ newPlanId: 'new-plan-1', skipped: null }),
    });

    ruleApplicationsRepository = createRuleApplicationsRepositoryMock();

    executor = new PromoteTaskToPlanExecutor(
      createMock<ActionExecutorRegistry>(),
      createMock<LoggerService>(),
      asMock<RuleApplicationsRepository>(ruleApplicationsRepository),
      taskPromotionService,
      tasksRepository,
      asMock<TaskTagsRepository>(taskTagsRepository),
    );
  });

  it('registers itself on module init', () => {
    const registry = new ActionExecutorRegistry(createMock<LoggerService>());
    const registerSpy = vi.spyOn(registry, 'register');
    const local = new PromoteTaskToPlanExecutor(
      registry,
      createMock<LoggerService>(),
      asMock<RuleApplicationsRepository>(ruleApplicationsRepository),
      taskPromotionService,
      tasksRepository,
      asMock<TaskTagsRepository>(taskTagsRepository),
    );

    local.onModuleInit();

    expect(registerSpy).toHaveBeenCalledWith(local);
    expect(registry.get('promote-task-to-plan')).toBe(local);
  });

  it('promotes a matched task and records applied with the promoted ids', async () => {
    await executor.execute(buildContext());

    expect(taskPromotionService.promote).toHaveBeenCalledWith({
      actorServiceAccountId: null,
      actorUserId: OWNER_ID,
      captureFailureIsFatal: false,
      taskId: 'task-1',
    });
    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ promotedTaskIds: ['task-1'] }),
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: 'applied',
      }),
    );
  });

  it('flags with no-eligible-task when no plan task carries a matched tag', async () => {
    taskTagsRepository.listTaskIdsByPlanAndTags.mockResolvedValue([]);

    await executor.execute(buildContext());

    expect(taskPromotionService.promote).not.toHaveBeenCalled();
    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ reason: 'no-eligible-task' }),
        state: 'flagged',
      }),
    );
  });

  it('skips a legacy promoted task (SKIPPED + promoted tag)', async () => {
    taskFindOne.mockResolvedValue(
      asMock<Task>({ id: 'task-1', status: 'SKIPPED' }),
    );
    taskTagsRepository.findByTaskAndTag.mockResolvedValue(
      taskTagsFactory.build({ tag: 'promoted' }),
    );

    await executor.execute(buildContext());

    // No eligible candidate remains → flagged, promotion not invoked.
    expect(taskPromotionService.promote).not.toHaveBeenCalled();
    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'flagged' }),
    );
  });

  it('skips a status-PROMOTED task that has no promoted tag', async () => {
    taskFindOne.mockResolvedValue(
      asMock<Task>({ id: 'task-1', status: 'PROMOTED' }),
    );
    taskTagsRepository.findByTaskAndTag.mockResolvedValue(null);

    await executor.execute(buildContext());

    expect(taskPromotionService.promote).not.toHaveBeenCalled();
    expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'flagged' }),
    );
  });
});
