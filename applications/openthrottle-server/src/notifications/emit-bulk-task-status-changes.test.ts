import { createMock } from '@golevelup/ts-vitest';
import type { Task } from '@openthrottle/nestjs-repositories';
import { describe, expect, test, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { updateMatchingTasksAndEmitStatusChanged } from './emit-bulk-task-status-changes';
import type { NotificationsService } from './notifications.service';

describe('updateMatchingTasksAndEmitStatusChanged', () => {
  const emitTaskStatusChanged = vi.fn();
  const notifications = createMock<NotificationsService>({
    emitTaskStatusChanged,
  });

  const taskRepo = {
    find: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  } as unknown as Repository<Task>;

  test('returns 0 and skips update when no tasks match', async () => {
    vi.mocked(taskRepo.find).mockResolvedValueOnce([]);

    const count = await updateMatchingTasksAndEmitStatusChanged({
      fromStatuses: ['PENDING', 'IN_PROGRESS'],
      notifications,
      planId: 'plan-1',
      taskRepo,
      toStatus: 'QUEUED',
    });

    expect(count).toBe(0);
    expect(taskRepo.update).not.toHaveBeenCalled();
    expect(emitTaskStatusChanged).not.toHaveBeenCalled();
  });

  test('updates matching tasks and emits one event per task', async () => {
    vi.mocked(taskRepo.find).mockResolvedValueOnce([
      { id: 'task-a' },
      { id: 'task-b' },
    ] as Task[]);

    const count = await updateMatchingTasksAndEmitStatusChanged({
      fromStatuses: ['PENDING', 'IN_PROGRESS'],
      notifications,
      planId: 'plan-1',
      taskRepo,
      toStatus: 'QUEUED',
    });

    expect(count).toBe(2);
    expect(taskRepo.update).toHaveBeenCalledOnce();
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
});
