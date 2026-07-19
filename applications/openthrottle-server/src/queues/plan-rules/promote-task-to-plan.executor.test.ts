/**
 * @description Unit tests for {@link PromoteTaskToPlanExecutor}: resolving plan
 * tasks that carry the rule's matched tags, delegating each to the shared
 * TaskPromotionService, skipping already-promoted tasks, and recording the
 * ledger outcome (applied with promoted ids, or flagged when nothing matched).
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type Plan,
  type RuleApplicationsService,
  type TagActionRule,
  type Task,
  type TagsService,
  type TasksService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import type { MatchedTagAction } from '@openthrottle/openthrottle-skills';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ActionExecutorRegistry,
  type ActionExecutorContext,
} from './action-executor';
import { PromoteTaskToPlanExecutor } from './promote-task-to-plan.executor';
import type { TaskPromotionService } from '../task-promotion/task-promotion.service';

const PLAN_ID = '00000000-0000-4000-8000-0000000000a1';
const OWNER_ID = '00000000-0000-4000-8000-0000000000b2';

describe('PromoteTaskToPlanExecutor', () => {
  let executor: PromoteTaskToPlanExecutor;
  let ruleApplicationsService: RuleApplicationsService;
  let tagsService: TagsService;
  let tasksService: TasksService;
  let taskPromotionService: TaskPromotionService;
  let getRawMany: ReturnType<typeof vi.fn>;
  let tagFindOne: ReturnType<typeof vi.fn>;
  let taskFindOne: ReturnType<typeof vi.fn>;

  const buildContext = (): ActionExecutorContext => ({
    action: asMock<MatchedTagAction>({
      actionPayload: {},
      actionType: 'promote-task-to-plan',
      matchedTags: ['promote'],
      ruleId: 'rule-1',
    }),
    ownerUserId: OWNER_ID,
    plan: asMock<Plan>({ id: PLAN_ID }),
    rule: asMock<TagActionRule>({ id: 'rule-1' }),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    getRawMany = vi.fn().mockResolvedValue([{ taskId: 'task-1' }]);
    const queryBuilder = {
      andWhere: vi.fn().mockReturnThis(),
      getRawMany,
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    tagFindOne = vi.fn().mockResolvedValue(null);
    tagsService = createMock<TagsService>({
      getTaskTagsRepository: vi.fn(() =>
        asMock<Repository<never>>({
          createQueryBuilder: vi.fn(() => asMock(queryBuilder)),
          findOne: tagFindOne,
        }),
      ),
    });

    taskFindOne = vi
      .fn()
      .mockResolvedValue(asMock<Task>({ id: 'task-1', status: 'PENDING' }));
    tasksService = createMock<TasksService>({
      getRepository: vi.fn(() =>
        asMock<Repository<Task>>({ findOne: taskFindOne }),
      ),
    });

    taskPromotionService = createMock<TaskPromotionService>({
      promote: vi
        .fn()
        .mockResolvedValue({ newPlanId: 'new-plan-1', skipped: null }),
    });

    ruleApplicationsService = createMock<RuleApplicationsService>({
      record: vi.fn(),
    });

    executor = new PromoteTaskToPlanExecutor(
      createMock<ActionExecutorRegistry>(),
      createMock<LoggerService>(),
      ruleApplicationsService,
      tagsService,
      taskPromotionService,
      tasksService,
    );
  });

  it('registers itself on module init', () => {
    const registry = new ActionExecutorRegistry(createMock<LoggerService>());
    const registerSpy = vi.spyOn(registry, 'register');
    const local = new PromoteTaskToPlanExecutor(
      registry,
      createMock<LoggerService>(),
      ruleApplicationsService,
      tagsService,
      taskPromotionService,
      tasksService,
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
      taskId: 'task-1',
    });
    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ promotedTaskIds: ['task-1'] }),
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: 'applied',
      }),
    );
  });

  it('flags with no-eligible-task when no plan task carries a matched tag', async () => {
    getRawMany.mockResolvedValue([]);

    await executor.execute(buildContext());

    expect(taskPromotionService.promote).not.toHaveBeenCalled();
    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ reason: 'no-eligible-task' }),
        state: 'flagged',
      }),
    );
  });

  it('skips a task already promoted (SKIPPED + promoted tag)', async () => {
    taskFindOne.mockResolvedValue(
      asMock<Task>({ id: 'task-1', status: 'SKIPPED' }),
    );
    tagFindOne.mockResolvedValue(asMock({ tag: 'promoted' }));

    await executor.execute(buildContext());

    // No eligible candidate remains → flagged, promotion not invoked.
    expect(taskPromotionService.promote).not.toHaveBeenCalled();
    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'flagged' }),
    );
  });
});
