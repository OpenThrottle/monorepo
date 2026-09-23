import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import type { EntityManager } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { Task } from '../tasks/task.entity.ts';
import {
  RULE_APPLICATION_STATES,
  RuleApplication,
} from './rule-application.entity.ts';
import {
  RuleApplicationsService,
  SOFT_CLOSED_TASK_STATUS,
} from './rule-applications.service.ts';

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

const taskRow = (id: string, status: string): Task =>
  createMock<Task>({ id, status });

describe('RuleApplicationsService.orphanUnmatchedApplications', () => {
  const find = vi.fn();
  const taskRepoFind = vi.fn().mockResolvedValue([]);
  const managerGetRepository = vi.fn(() => ({ find: taskRepoFind }));
  const managerUpdate = vi.fn().mockResolvedValue(undefined);
  const transaction = vi.fn(
    async (
      cb: (manager: {
        getRepository: typeof managerGetRepository;
        update: typeof managerUpdate;
      }) => unknown,
    ) =>
      cb({
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
    taskRepoFind.mockResolvedValue([]);
    managerGetRepository.mockReturnValue({ find: taskRepoFind });
    managerUpdate.mockResolvedValue(undefined);

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
    taskRepoFind.mockResolvedValue([taskRow('task-1', 'PENDING')]);

    const result = await service.orphanUnmatchedApplications(PLAN_ID, [
      'rule-still-matched',
    ]);

    expect(result.rowsOrphaned).toBe(1);
    expect(managerUpdate).toHaveBeenNthCalledWith(
      1,
      RuleApplication,
      { id: expect.anything() },
      { state: RULE_APPLICATION_STATES.ORPHANED },
    );
    expect(managerGetRepository).toHaveBeenCalledWith(Task);
    expect(taskRepoFind).toHaveBeenCalledWith({
      lock: { mode: 'pessimistic_write' },
      where: { id: expect.anything() },
    });
    expect(managerUpdate).toHaveBeenNthCalledWith(
      2,
      Task,
      { id: expect.anything() },
      { status: SOFT_CLOSED_TASK_STATUS },
    );
    expect(result.softClosedTasks).toEqual([
      {
        from: 'PENDING',
        planId: PLAN_ID,
        taskId: 'task-1',
        to: SOFT_CLOSED_TASK_STATUS,
      },
    ]);
  });

  test('does not touch tasks for an orphaned row with no injected task', async () => {
    find.mockResolvedValue([appliedRow('app-2', 'rule-unmatched', null)]);

    const result = await service.orphanUnmatchedApplications(PLAN_ID, []);

    expect(result.rowsOrphaned).toBe(1);
    expect(result.softClosedTasks).toEqual([]);
    expect(managerUpdate).toHaveBeenCalledTimes(1);
    expect(managerGetRepository).not.toHaveBeenCalled();
  });

  test('is a no-op when every applied row still matches', async () => {
    find.mockResolvedValue([appliedRow('app-3', 'rule-a', 'task-3')]);

    const result = await service.orphanUnmatchedApplications(PLAN_ID, [
      'rule-a',
    ]);

    expect(result).toEqual({ rowsOrphaned: 0, softClosedTasks: [] });
    expect(transaction).not.toHaveBeenCalled();
  });

  test('does not soft-close (or report a transition for) an already-terminal task', async () => {
    find.mockResolvedValue([appliedRow('app-4', 'rule-unmatched', 'task-4')]);
    taskRepoFind.mockResolvedValue([taskRow('task-4', 'COMPLETED')]);

    const result = await service.orphanUnmatchedApplications(PLAN_ID, []);

    expect(result.rowsOrphaned).toBe(1);
    expect(result.softClosedTasks).toEqual([]);
    // Only the ledger row flip runs — the terminal task is never written.
    expect(managerUpdate).toHaveBeenCalledTimes(1);
  });

  test('reports one transition per eligible task when several orphan in one pass', async () => {
    find.mockResolvedValue([
      appliedRow('app-5', 'rule-unmatched-1', 'task-5'),
      appliedRow('app-6', 'rule-unmatched-2', 'task-6'),
    ]);
    taskRepoFind.mockResolvedValue([
      taskRow('task-5', 'IN_PROGRESS'),
      taskRow('task-6', 'BLOCKED'),
    ]);

    const result = await service.orphanUnmatchedApplications(PLAN_ID, []);

    expect(result.rowsOrphaned).toBe(2);
    expect(result.softClosedTasks).toEqual([
      {
        from: 'IN_PROGRESS',
        planId: PLAN_ID,
        taskId: 'task-5',
        to: SOFT_CLOSED_TASK_STATUS,
      },
      {
        from: 'BLOCKED',
        planId: PLAN_ID,
        taskId: 'task-6',
        to: SOFT_CLOSED_TASK_STATUS,
      },
    ]);
  });

  test('uses a caller-supplied manager instead of opening its own transaction', async () => {
    find.mockResolvedValue([appliedRow('app-7', 'rule-unmatched', 'task-7')]);
    const callerTaskRepoFind = vi
      .fn()
      .mockResolvedValue([taskRow('task-7', 'PENDING')]);
    const callerManagerUpdate = vi.fn().mockResolvedValue(undefined);
    const callerManager = createMock<EntityManager>({
      getRepository: vi.fn(() => asMock({ find: callerTaskRepoFind })),
      update: callerManagerUpdate,
    });

    const result = await service.orphanUnmatchedApplications(
      PLAN_ID,
      [],
      callerManager,
    );

    expect(transaction).not.toHaveBeenCalled();
    expect(callerManagerUpdate).toHaveBeenCalledTimes(2);
    expect(result.softClosedTasks).toEqual([
      {
        from: 'PENDING',
        planId: PLAN_ID,
        taskId: 'task-7',
        to: SOFT_CLOSED_TASK_STATUS,
      },
    ]);
  });
});
