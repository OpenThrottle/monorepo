import { createMock } from '@golevelup/ts-vitest';
import type { Task } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  Repository,
  SelectQueryBuilder,
  UpdateQueryBuilder,
} from 'typeorm';
import { updateMatchingTasksAndEmitStatusChanged } from './emit-bulk-task-status-changes';
import type { NotificationsService } from './notifications.service';

describe('updateMatchingTasksAndEmitStatusChanged', () => {
  const emitTaskStatusChanged = vi.fn();
  const notifications = createMock<NotificationsService>({
    emitTaskStatusChanged,
  });

  // The helper runs a single `UPDATE ... RETURNING id` query builder; mock the chain and let each
  // test drive what RETURNING yields. `.update()` on the select builder yields an update builder
  // that carries `set`/`where`/`andWhere`/`returning`/`execute`.
  const execute = vi.fn();
  const updateQueryBuilder = createMock<UpdateQueryBuilder<Task>>({
    andWhere: vi.fn().mockReturnThis(),
    execute,
    returning: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  });
  const queryBuilder = createMock<SelectQueryBuilder<Task>>({
    update: vi.fn(() => updateQueryBuilder),
  });
  const taskRepo = createMock<Repository<Task>>({
    createQueryBuilder: vi.fn(() => queryBuilder),
  });

  beforeEach(() => {
    emitTaskStatusChanged.mockClear();
    execute.mockReset();
  });

  test('returns 0 and emits nothing when no rows are updated', async () => {
    execute.mockResolvedValueOnce({ affected: 0, generatedMaps: [], raw: [] });

    const count = await updateMatchingTasksAndEmitStatusChanged({
      fromStatuses: ['PENDING', 'IN_PROGRESS'],
      notifications,
      planId: 'plan-1',
      taskRepo,
      toStatus: 'QUEUED',
    });

    expect(count).toBe(0);
    expect(emitTaskStatusChanged).not.toHaveBeenCalled();
  });

  test('updates matching tasks and emits one event per updated row', async () => {
    execute.mockResolvedValueOnce({
      affected: 2,
      generatedMaps: [],
      raw: [{ id: 'task-a' }, { id: 'task-b' }],
    });

    const count = await updateMatchingTasksAndEmitStatusChanged({
      fromStatuses: ['PENDING', 'IN_PROGRESS'],
      notifications,
      planId: 'plan-1',
      taskRepo,
      toStatus: 'QUEUED',
    });

    expect(count).toBe(2);
    expect(emitTaskStatusChanged).toHaveBeenCalledTimes(2);
    expect(emitTaskStatusChanged).toHaveBeenCalledWith({
      planId: 'plan-1',
      status: 'QUEUED',
      taskId: 'task-a',
    });
    expect(emitTaskStatusChanged).toHaveBeenCalledWith({
      planId: 'plan-1',
      status: 'QUEUED',
      taskId: 'task-b',
    });
  });

  // Atomicity (Plan ca6e3ecb): events come from the rows the UPDATE actually changed (its RETURNING
  // output), not from an earlier SELECT. The previous SELECT-then-UPDATE could emit for rows a
  // concurrent writer changed between the two statements; now it cannot.
  test('emits for exactly the rows the atomic UPDATE ... RETURNING changed', async () => {
    execute.mockResolvedValueOnce({
      affected: 1,
      generatedMaps: [],
      raw: [{ id: 'task-a' }],
    });

    const count = await updateMatchingTasksAndEmitStatusChanged({
      fromStatuses: ['PENDING', 'IN_PROGRESS'],
      notifications,
      planId: 'plan-1',
      taskRepo,
      toStatus: 'QUEUED',
    });

    expect(count).toBe(1);
    expect(emitTaskStatusChanged).toHaveBeenCalledTimes(1);
    expect(emitTaskStatusChanged).toHaveBeenCalledWith({
      planId: 'plan-1',
      status: 'QUEUED',
      taskId: 'task-a',
    });
  });
});
