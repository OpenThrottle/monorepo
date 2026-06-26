/**
 * @description Unit tests for DatabaseBackupRepeatableService (repeatable registration).
 */

import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Job, Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DATABASE_BACKUP_JOB_NAME,
  DATABASE_BACKUP_QUEUE_NAME,
  DATABASE_BACKUP_REPEATABLE_JOB_ID,
} from './database-backup.constants';
import { resolveDatabaseBackupSchedule } from './database-backup.env';
import { DatabaseBackupRepeatableService } from './database-backup-repeatable.service';
import type {
  DatabaseBackupJobPayload,
  DatabaseBackupJobResult,
} from './database-backup.types';

vi.mock('./database-backup.env', () => ({
  resolveDatabaseBackupSchedule: vi.fn(),
}));

describe('DatabaseBackupRepeatableService', () => {
  let service: DatabaseBackupRepeatableService;
  const scheduleMock = vi.mocked(resolveDatabaseBackupSchedule);
  const queueAdd = vi.fn();
  const logger = createMock<LoggerService>();

  const mockQueue = createMock<
    Queue<DatabaseBackupJobPayload, DatabaseBackupJobResult>
  >({
    add: queueAdd,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    queueAdd.mockResolvedValue(
      createMock<Job<DatabaseBackupJobPayload, DatabaseBackupJobResult>>({
        repeatJobKey: 'repeat-key-1',
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseBackupRepeatableService,
        { provide: LoggerService, useValue: logger },
        {
          provide: getQueueToken(DATABASE_BACKUP_QUEUE_NAME),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get(DatabaseBackupRepeatableService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when schedule is disabled', () => {
    beforeEach(() => {
      scheduleMock.mockReturnValue({
        enabled: false,
        reason:
          'DATABASE_BACKUP_CRON not set; skipping repeatable database-backup registration.',
      });
    });

    it('should not register a repeatable job', async () => {
      await service.onModuleInit();

      expect(queueAdd).not.toHaveBeenCalled();
    });

    it('should log the skip reason at debug', async () => {
      await service.onModuleInit();

      expect(logger.debug).toHaveBeenCalledWith(
        'DATABASE_BACKUP_CRON not set; skipping repeatable database-backup registration.',
        DatabaseBackupRepeatableService.name,
      );
    });
  });

  describe('when schedule is enabled', () => {
    beforeEach(() => {
      scheduleMock.mockReturnValue({
        cronPattern: '0 0 0 * * *',
        enabled: true,
        jobName: DATABASE_BACKUP_JOB_NAME,
        jobTimeoutMs: 1_800_000,
        pnpmScript: 'database:backup',
        repeatJobId: DATABASE_BACKUP_REPEATABLE_JOB_ID,
        tz: undefined,
        workspaceRoot: '/repo/root',
      });
    });

    it('should register queue.add with cron pattern and stable jobId', async () => {
      await service.onModuleInit();

      expect(queueAdd).toHaveBeenCalledWith(
        DATABASE_BACKUP_JOB_NAME,
        {},
        expect.objectContaining({
          attempts: 3,
          jobId: DATABASE_BACKUP_REPEATABLE_JOB_ID,
          repeat: { pattern: '0 0 0 * * *' },
        }),
      );
    });

    it('should log registration at info', async () => {
      await service.onModuleInit();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Database-backup repeatable job registered'),
        DatabaseBackupRepeatableService.name,
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('pattern=0 0 0 * * *'),
        DatabaseBackupRepeatableService.name,
      );
    });

    it('should include tz in repeat options when configured', async () => {
      scheduleMock.mockReturnValue({
        cronPattern: '0 0 0 * * *',
        enabled: true,
        jobName: DATABASE_BACKUP_JOB_NAME,
        jobTimeoutMs: 1_800_000,
        pnpmScript: 'database:backup',
        repeatJobId: DATABASE_BACKUP_REPEATABLE_JOB_ID,
        tz: 'America/Los_Angeles',
        workspaceRoot: '/repo/root',
      });

      await service.onModuleInit();

      expect(queueAdd).toHaveBeenCalledWith(
        DATABASE_BACKUP_JOB_NAME,
        {},
        expect.objectContaining({
          attempts: 3,
          jobId: DATABASE_BACKUP_REPEATABLE_JOB_ID,
          repeat: { pattern: '0 0 0 * * *', tz: 'America/Los_Angeles' },
        }),
      );
    });
  });
});
