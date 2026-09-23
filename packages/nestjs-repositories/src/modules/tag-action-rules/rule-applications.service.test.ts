import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { Task } from '../tasks/task.entity.ts';
import {
  RULE_APPLICATION_STATES,
  RuleApplication,
} from './rule-application.entity.ts';
import type { OrphanedTaskStatusCaptureParams } from './rule-applications.service.ts';
import { RuleApplicationsService } from './rule-applications.service.ts';

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

  // Select-lock-update: getMany() drives which rows are "affected" (and each row's own
  // status, for the capture's `fromStatus`); the update-builder's execute() is the by-id update.
  const taskSelectGetMany = vi.fn().mockResolvedValue([]);
  const taskSelectQueryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    getMany: taskSelectGetMany,
    setLock: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const taskRepoForManager = {
    createQueryBuilder: vi.fn(() => taskSelectQueryBuilder),
  };

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
  const managerGetRepository = vi.fn(() => taskRepoForManager);
  const transaction = vi.fn(
    async (
      cb: (manager: {
        createQueryBuilder: typeof managerCreateQueryBuilder;
        getRepository: typeof managerGetRepository;
        update: typeof managerUpdate;
      }) => unknown,
    ) =>
      cb({
        createQueryBuilder: managerCreateQueryBuilder,
        getRepository: managerGetRepository,
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
    taskUpdateExecute.mockResolvedValue({ affected: 1 });
    managerCreateQueryBuilder.mockReturnValue(taskUpdateBuilder);
    taskSelectQueryBuilder.setLock.mockReturnThis();
    taskSelectQueryBuilder.where.mockReturnThis();
    taskSelectQueryBuilder.andWhere.mockReturnThis();
    taskSelectGetMany.mockReset().mockResolvedValue([]);
    managerGetRepository.mockReturnValue(taskRepoForManager);

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
    taskSelectGetMany.mockResolvedValue([{ id: 'task-1', status: 'PENDING' }]);

    const count = await service.orphanUnmatchedApplications(PLAN_ID, [
      'rule-still-matched',
    ]);

    expect(count).toBe(1);
    expect(managerUpdate).toHaveBeenCalledWith(
      RuleApplication,
      { id: expect.anything() },
      { state: RULE_APPLICATION_STATES.ORPHANED },
    );
    expect(taskSelectQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(taskSelectQueryBuilder.where).toHaveBeenCalledWith(
      'task.id IN (:...ids)',
      { ids: ['task-1'] },
    );
    expect(taskSelectQueryBuilder.andWhere).toHaveBeenCalledWith(
      'task.status IN (:...nonTerminal)',
      { nonTerminal: ['BACKLOG', 'BLOCKED', 'IN_PROGRESS', 'PENDING'] },
    );
    expect(taskUpdateBuilder.update).toHaveBeenCalledWith(Task);
    expect(taskUpdateBuilder.set).toHaveBeenCalledWith({ status: 'SKIPPED' });
    expect(taskUpdateBuilder.where).toHaveBeenCalledWith('id IN (:...ids)', {
      ids: ['task-1'],
    });
  });

  test('does not touch tasks for an orphaned row with no injected task', async () => {
    find.mockResolvedValue([appliedRow('app-2', 'rule-unmatched', null)]);

    const count = await service.orphanUnmatchedApplications(PLAN_ID, []);

    expect(count).toBe(1);
    expect(managerUpdate).toHaveBeenCalledTimes(1);
    expect(managerGetRepository).not.toHaveBeenCalled();
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

  test('skips the task update entirely when every candidate task is already terminal', async () => {
    find.mockResolvedValue([appliedRow('app-4', 'rule-unmatched', 'task-4')]);
    taskSelectGetMany.mockResolvedValue([]);

    const count = await service.orphanUnmatchedApplications(PLAN_ID, []);

    expect(count).toBe(1);
    expect(managerCreateQueryBuilder).not.toHaveBeenCalled();
  });

  test('invokes the supplied capture once per soft-closed task, with its own prior status, inside the same transaction', async () => {
    find.mockResolvedValue([
      appliedRow('app-1', 'rule-unmatched', 'task-1'),
      appliedRow('app-2', 'rule-unmatched-2', 'task-2'),
    ]);
    taskSelectGetMany.mockResolvedValue([
      { id: 'task-1', status: 'PENDING' },
      { id: 'task-2', status: 'IN_PROGRESS' },
    ]);
    const capture = vi
      .fn<(params: OrphanedTaskStatusCaptureParams) => Promise<void>>()
      .mockResolvedValue(undefined);

    await service.orphanUnmatchedApplications(
      PLAN_ID,
      ['rule-still-matched'],
      capture,
    );

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStatus: 'PENDING',
        planId: PLAN_ID,
        taskId: 'task-1',
      }),
    );
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStatus: 'IN_PROGRESS',
        planId: PLAN_ID,
        taskId: 'task-2',
      }),
    );
  });

  test('never invokes the supplied capture for a task the terminal-status guard excluded', async () => {
    find.mockResolvedValue([appliedRow('app-1', 'rule-unmatched', 'task-1')]);
    taskSelectGetMany.mockResolvedValue([]);
    const capture = vi
      .fn<(params: OrphanedTaskStatusCaptureParams) => Promise<void>>()
      .mockResolvedValue(undefined);

    await service.orphanUnmatchedApplications(PLAN_ID, [], capture);

    expect(capture).not.toHaveBeenCalled();
  });
});
