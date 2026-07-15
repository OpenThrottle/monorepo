import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Task } from '../tasks/task.entity';
import {
  RULE_APPLICATION_STATES,
  RuleApplication,
} from './rule-application.entity';
import { RuleApplicationsService } from './rule-applications.service';

const PLAN_ID = 'plan-1';

const appliedRow = (
  id: string,
  ruleId: string,
  taskId: string | null,
): RuleApplication =>
  createMock<RuleApplication>({
    id,
    planId: PLAN_ID,
    ruleId,
    state: RULE_APPLICATION_STATES.APPLIED,
    taskId,
  });

describe('RuleApplicationsService.orphanUnmatchedApplications', () => {
  const find = vi.fn();
  const taskUpdateExecute = vi.fn().mockResolvedValue({ affected: 1 });
  const taskUpdateBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    execute: taskUpdateExecute,
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const managerUpdate = vi.fn().mockResolvedValue(undefined);
  const managerCreateQueryBuilder = vi.fn(() => taskUpdateBuilder);
  const transaction = vi.fn(
    async (
      cb: (manager: {
        createQueryBuilder: typeof managerCreateQueryBuilder;
        update: typeof managerUpdate;
      }) => unknown,
    ) =>
      cb({
        createQueryBuilder: managerCreateQueryBuilder,
        update: managerUpdate,
      }),
  );

  const repository = {
    find,
    manager: { transaction },
  };

  let service: RuleApplicationsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    taskUpdateBuilder.update.mockReturnThis();
    taskUpdateBuilder.set.mockReturnThis();
    taskUpdateBuilder.where.mockReturnThis();
    taskUpdateBuilder.andWhere.mockReturnThis();
    managerCreateQueryBuilder.mockReturnValue(taskUpdateBuilder);

    const app = await Test.createTestingModule({
      providers: [
        RuleApplicationsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: getRepositoryToken(RuleApplication), useValue: repository },
      ],
    }).compile();
    service = app.get(RuleApplicationsService);
  });

  test('orphans unmatched applied rows and soft-closes their injected tasks', async () => {
    find.mockResolvedValue([appliedRow('app-1', 'rule-unmatched', 'task-1')]);

    const count = await service.orphanUnmatchedApplications(PLAN_ID, [
      'rule-still-matched',
    ]);

    expect(count).toBe(1);
    expect(managerUpdate).toHaveBeenCalledWith(
      RuleApplication,
      { id: expect.anything() },
      { state: RULE_APPLICATION_STATES.ORPHANED },
    );
    expect(managerCreateQueryBuilder).toHaveBeenCalledTimes(1);
    expect(taskUpdateBuilder.update).toHaveBeenCalledWith(Task);
    expect(taskUpdateBuilder.set).toHaveBeenCalledWith({ status: 'SKIPPED' });
    expect(taskUpdateBuilder.where).toHaveBeenCalledWith('id IN (:...ids)', {
      ids: ['task-1'],
    });
    expect(taskUpdateBuilder.andWhere).toHaveBeenCalledWith(
      'status NOT IN (:...terminal)',
      { terminal: ['CANCELED', 'COMPLETED', 'SKIPPED'] },
    );
  });

  test('does not touch tasks for an orphaned row with no injected task', async () => {
    find.mockResolvedValue([appliedRow('app-2', 'rule-unmatched', null)]);

    const count = await service.orphanUnmatchedApplications(PLAN_ID, []);

    expect(count).toBe(1);
    expect(managerUpdate).toHaveBeenCalledTimes(1);
    expect(managerCreateQueryBuilder).not.toHaveBeenCalled();
  });

  test('is a no-op when every applied row still matches', async () => {
    find.mockResolvedValue([appliedRow('app-3', 'rule-a', 'task-3')]);

    const count = await service.orphanUnmatchedApplications(PLAN_ID, [
      'rule-a',
    ]);

    expect(count).toBe(0);
    expect(transaction).not.toHaveBeenCalled();
  });
});
