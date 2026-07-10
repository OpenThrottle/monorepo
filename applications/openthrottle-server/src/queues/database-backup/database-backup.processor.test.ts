/**
 * @description Unit tests for DatabaseBackupProcessor (spawn command and cwd).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { NotificationsService } from '../../notifications/notifications.service';
import { DATABASE_BACKUP_PNPM_SCRIPT } from './database-backup.constants';
import { DatabaseBackupProcessor } from './database-backup.processor';
import { spawnDatabaseBackup } from './database-backup.spawn';
import type { DatabaseBackupJob } from './database-backup.types';

vi.mock('./database-backup.spawn', () => ({
  spawnDatabaseBackup: vi.fn(),
}));

vi.mock('./database-backup.env', () => ({
  getDatabaseBackupWorkspaceRoot: vi.fn(() => '/mock/workspace'),
}));

describe('DatabaseBackupProcessor', () => {
  let processor: DatabaseBackupProcessor;
  const spawnMock = vi.mocked(spawnDatabaseBackup);
  const notifications = createMock<NotificationsService>();

  beforeEach(async () => {
    vi.clearAllMocks();
    spawnMock.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseBackupProcessor,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NotificationsService,
          useValue: notifications,
        },
      ],
    }).compile();

    processor = module.get(DatabaseBackupProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should spawn pnpm run database:backup with workspace root cwd', async () => {
    const job = createMock<DatabaseBackupJob>({ data: {}, id: 'job-1' });

    const result = await processor.process(job);

    expect(spawnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: '/mock/workspace',
        script: DATABASE_BACKUP_PNPM_SCRIPT,
      }),
    );
    expect(result).toEqual({
      exitCode: 0,
      workspaceRoot: '/mock/workspace',
    });
    expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith({
      jobType: 'database-backup',
      message: 'Database backup completed (job job-1)',
      severity: 'success',
    });
  });

  it('should throw and notify when backup exits non-zero', async () => {
    spawnMock.mockResolvedValue(1);
    const job = createMock<DatabaseBackupJob>({ data: {}, id: 'job-2' });

    await expect(processor.process(job)).rejects.toThrow(
      `${DATABASE_BACKUP_PNPM_SCRIPT} exited with code 1`,
    );

    expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith({
      jobType: 'database-backup',
      message: 'Database backup failed: job-2',
      severity: 'error',
    });
  });

  it('should throw when spawn fails', async () => {
    spawnMock.mockRejectedValue(new Error('spawn ENOENT'));
    const job = createMock<DatabaseBackupJob>({ data: {}, id: 'job-3' });

    await expect(processor.process(job)).rejects.toThrow('spawn ENOENT');
  });

  it('should throw when backup exits via signal', async () => {
    spawnMock.mockResolvedValue(null);
    const job = createMock<DatabaseBackupJob>({ data: {}, id: 'job-4' });

    await expect(processor.process(job)).rejects.toThrow(
      'exited with code signal',
    );
  });
});
