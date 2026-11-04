/**
 * @description Unit tests for {@link applyBulkTaskStatusChange}: the select-lock-update-capture
 * mechanics shared by every bulk task-status writer (plan cancel, plan enqueue, the stale-run
 * sweeper's stranded-plan reconcile). Covers the per-row `from` (never the bulk filter, never a
 * guess), the pessimistic-write lock + by-id update, and the fatal/non-fatal capture-failure split.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import type { EntityManager } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  applyBulkTaskStatusChange,
  type ApplyBulkTaskStatusChangeParams,
} from './bulk-task-status-change.ts';
import type { WorkLedgerCaptureService } from './work-ledger-capture.service.ts';
import { WORK_LEDGER_CAPTURE_FAILED_MARKER } from './work-ledger-capture-failure-marker.ts';

describe('applyBulkTaskStatusChange', () => {
  const getMany = vi.fn();
  const execute = vi.fn();
  const queryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    execute,
    getMany,
    set: vi.fn().mockReturnThis(),
    setLock: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const taskRepo = { createQueryBuilder: vi.fn(() => queryBuilder) };
  const manager = createMock<EntityManager>({
    getRepository: asMock(vi.fn(() => taskRepo)),
  });

  const recordStatusChange = vi.fn().mockResolvedValue(undefined);
  const resolveSessionId = vi.fn().mockResolvedValue('session-1');
  const workLedgerCapture = createMock<WorkLedgerCaptureService>({
    recordStatusChange,
    resolveSessionId,
  });

  const loggerError = vi.fn();
  const logger = createMock<LoggerService>({ error: loggerError });

  const baseParams: ApplyBulkTaskStatusChangeParams = {
    actorKind: 'user',
    actorSub: 'user-1',
    captureFailureIsFatal: true,
    fromStatuses: ['PENDING', 'IN_PROGRESS'],
    logger,
    manager,
    planId: 'plan-1',
    toStatus: 'QUEUED',
    workLedgerCapture,
  };

  beforeEach(() => {
    getMany.mockReset();
    execute.mockReset().mockResolvedValue({ affected: 0 });
    queryBuilder.where.mockClear();
    queryBuilder.andWhere.mockClear();
    queryBuilder.set.mockClear();
    queryBuilder.setLock.mockClear();
    recordStatusChange.mockReset().mockResolvedValue(undefined);
    resolveSessionId.mockReset().mockResolvedValue('session-1');
    loggerError.mockClear();
  });

  test('returns [] and never updates or captures when nothing matches', async () => {
    getMany.mockResolvedValue([]);

    const affected = await applyBulkTaskStatusChange(baseParams);

    expect(affected).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
    expect(recordStatusChange).not.toHaveBeenCalled();
  });

  test('selects under a pessimistic write lock, updates by id, and captures each row with its OWN prior status (not the bulk fromStatuses filter)', async () => {
    getMany.mockResolvedValue([
      { id: 'task-a', status: 'PENDING' },
      { id: 'task-b', status: 'IN_PROGRESS' },
    ]);

    const affected = await applyBulkTaskStatusChange(baseParams);

    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(queryBuilder.where).toHaveBeenCalledWith('task.plan_id = :planId', {
      planId: 'plan-1',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'task.status IN (:...fromStatuses)',
      { fromStatuses: ['PENDING', 'IN_PROGRESS'] },
    );
    expect(queryBuilder.set).toHaveBeenCalledWith({ status: 'QUEUED' });
    expect(queryBuilder.where).toHaveBeenCalledWith('id IN (:...ids)', {
      ids: ['task-a', 'task-b'],
    });
    expect(execute).toHaveBeenCalled();

    expect(affected).toEqual([
      { fromStatus: 'PENDING', taskId: 'task-a' },
      { fromStatus: 'IN_PROGRESS', taskId: 'task-b' },
    ]);
    // The session is resolved ONCE and shared across both rows — not once per row — so a bulk
    // reset of N tasks does not mint N instant work sessions.
    expect(resolveSessionId).toHaveBeenCalledTimes(1);
    expect(resolveSessionId).toHaveBeenCalledWith(manager, {
      actorKind: 'user',
      actorSub: 'user-1',
    });
    expect(recordStatusChange).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        entity: 'task',
        from: 'PENDING',
        planId: 'plan-1',
        sessionId: 'session-1',
        taskId: 'task-a',
        to: 'QUEUED',
      }),
    );
    expect(recordStatusChange).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        entity: 'task',
        from: 'IN_PROGRESS',
        planId: 'plan-1',
        sessionId: 'session-1',
        taskId: 'task-b',
        to: 'QUEUED',
      }),
    );
  });

  test('a fatal capture failure rethrows (rolling back the caller transaction)', async () => {
    getMany.mockResolvedValue([{ id: 'task-a', status: 'PENDING' }]);
    recordStatusChange.mockRejectedValue(new Error('ledger down'));

    await expect(
      applyBulkTaskStatusChange({ ...baseParams, captureFailureIsFatal: true }),
    ).rejects.toThrow('ledger down');
  });

  test('a non-fatal capture failure is logged behind the marker and the row still counts as affected', async () => {
    getMany.mockResolvedValue([{ id: 'task-a', status: 'PENDING' }]);
    recordStatusChange.mockRejectedValue(new Error('ledger down'));

    const affected = await applyBulkTaskStatusChange({
      ...baseParams,
      captureFailureIsFatal: false,
    });

    expect(affected).toEqual([{ fromStatus: 'PENDING', taskId: 'task-a' }]);
    expect(loggerError).toHaveBeenCalledTimes(1);

    const [message] = loggerError.mock.calls[0] ?? [];
    expect(message).toContain(WORK_LEDGER_CAPTURE_FAILED_MARKER);
    expect(message).toContain('id=task-a');
    expect(message).toContain('from=PENDING');
    expect(message).toContain('to=QUEUED');
  });

  test('a fatal session-resolution failure rethrows before any row capture is attempted', async () => {
    getMany.mockResolvedValue([
      { id: 'task-a', status: 'PENDING' },
      { id: 'task-b', status: 'IN_PROGRESS' },
    ]);
    resolveSessionId.mockRejectedValue(new Error('session down'));

    await expect(
      applyBulkTaskStatusChange({ ...baseParams, captureFailureIsFatal: true }),
    ).rejects.toThrow('session down');
    expect(recordStatusChange).not.toHaveBeenCalled();
  });

  test('a non-fatal session-resolution failure logs ONCE (not once per row) and skips every capture, but the row update stands', async () => {
    getMany.mockResolvedValue([
      { id: 'task-a', status: 'PENDING' },
      { id: 'task-b', status: 'IN_PROGRESS' },
    ]);
    resolveSessionId.mockRejectedValue(new Error('session down'));

    const affected = await applyBulkTaskStatusChange({
      ...baseParams,
      captureFailureIsFatal: false,
    });

    // The row update already committed (execute() ran before session resolution); only the
    // captures are skipped.
    expect(execute).toHaveBeenCalled();
    expect(affected).toEqual([
      { fromStatus: 'PENDING', taskId: 'task-a' },
      { fromStatus: 'IN_PROGRESS', taskId: 'task-b' },
    ]);
    expect(recordStatusChange).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledTimes(1);

    const [message] = loggerError.mock.calls[0] ?? [];
    expect(message).toContain(WORK_LEDGER_CAPTURE_FAILED_MARKER);
    expect(message).toContain('planId=plan-1');
    expect(message).toContain('taskIds=task-a,task-b');
  });
});
