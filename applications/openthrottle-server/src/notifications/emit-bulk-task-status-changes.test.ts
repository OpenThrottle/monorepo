import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { EntityManager } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { WorkLedgerCaptureService } from '../graphql/work-ledger/work-ledger-capture.service.ts';
import { updateMatchingTasksAndEmitStatusChanged } from './emit-bulk-task-status-changes.ts';
import type { NotificationsService } from './notifications.service.ts';

// The row-locking/update/capture mechanics live in applyBulkTaskStatusChange (its own dedicated
// test file); this suite only needs to verify updateMatchingTasksAndEmitStatusChanged forwards its
// params through and emits one notification per row that call reports as affected.
const mockApplyBulkTaskStatusChange = vi.fn();
vi.mock('../graphql/work-ledger/bulk-task-status-change.ts', () => ({
  applyBulkTaskStatusChange: (
    ...args: Parameters<typeof mockApplyBulkTaskStatusChange>
  ) => mockApplyBulkTaskStatusChange(...args),
}));

describe('updateMatchingTasksAndEmitStatusChanged', () => {
  const emitTaskStatusChanged = vi.fn();
  const notifications = createMock<NotificationsService>({
    emitTaskStatusChanged,
  });
  const logger = createMock<LoggerService>();
  const manager = createMock<EntityManager>();
  const workLedgerCapture = createMock<WorkLedgerCaptureService>();

  const baseParams = {
    actorKind: 'user',
    actorSub: 'user-1',
    captureFailureIsFatal: true,
    fromStatuses: ['PENDING', 'IN_PROGRESS'],
    logger,
    manager,
    notifications,
    planId: 'plan-1',
    toStatus: 'QUEUED',
    workLedgerCapture,
  };

  beforeEach(() => {
    emitTaskStatusChanged.mockClear();
    mockApplyBulkTaskStatusChange.mockReset();
  });

  test('returns 0 and emits nothing when no rows are affected', async () => {
    mockApplyBulkTaskStatusChange.mockResolvedValue([]);

    const count = await updateMatchingTasksAndEmitStatusChanged(baseParams);

    expect(count).toBe(0);
    expect(emitTaskStatusChanged).not.toHaveBeenCalled();
  });

  test('forwards its params to applyBulkTaskStatusChange unchanged', async () => {
    mockApplyBulkTaskStatusChange.mockResolvedValue([]);

    await updateMatchingTasksAndEmitStatusChanged(baseParams);

    expect(mockApplyBulkTaskStatusChange).toHaveBeenCalledWith(baseParams);
  });

  test('emits one task.status_changed event per affected row and returns the count', async () => {
    mockApplyBulkTaskStatusChange.mockResolvedValue([
      { fromStatus: 'PENDING', taskId: 'task-a' },
      { fromStatus: 'IN_PROGRESS', taskId: 'task-b' },
    ]);

    const count = await updateMatchingTasksAndEmitStatusChanged(baseParams);

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
});
