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
  const upsertJobScheduler = vi.fn();
  const logger = createMock<LoggerService>();

  const mockQueue = createMock<
    Queue<DatabaseBackupJobPayload, DatabaseBackupJobResult>
  >({
    upsertJobScheduler,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    upsertJobScheduler.mockResolvedValue(
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

  describe('when schedule is disabled (normal opt-out)', () => {
    beforeEach(() => {
      scheduleMock.mockReturnValue({
        enabled: false,
        reason:
          'DATABASE_BACKUP_CRON not set; skipping repeatable database-backup registration.',
      });
    });

    it('should not register a scheduler', async () => {
      await service.onModuleInit();

      expect(upsertJobScheduler).not.toHaveBeenCalled();
    });

    it('should log the skip reason at debug', async () => {
      await service.onModuleInit();

      expect(logger.debug).toHaveBeenCalledWith(
        'DATABASE_BACKUP_CRON not set; skipping repeatable database-backup registration.',
        DatabaseBackupRepeatableService.name,
      );
    });
  });

  describe('when schedule is rejected as invalid', () => {
    beforeEach(() => {
      scheduleMock.mockReturnValue({
        enabled: false,
        invalid: true,
        reason: 'DATABASE_BACKUP_CRON="0" rejected: too frequent.',
      });
    });

    it('should not register a scheduler', async () => {
      await service.onModuleInit();

      expect(upsertJobScheduler).not.toHaveBeenCalled();
    });

    it('should log loudly at warn (not debug)', async () => {
      await service.onModuleInit();

      expect(logger.warn).toHaveBeenCalledWith(
        'DATABASE_BACKUP_CRON="0" rejected: too frequent.',
        DatabaseBackupRepeatableService.name,
      );
      expect(logger.debug).not.toHaveBeenCalled();
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

    it('should upsert one scheduler keyed by the stable id (idempotent)', async () => {
      await service.onModuleInit();

      expect(upsertJobScheduler).toHaveBeenCalledTimes(1);
      expect(upsertJobScheduler).toHaveBeenCalledWith(
        DATABASE_BACKUP_REPEATABLE_JOB_ID,
        { pattern: '0 0 0 * * *' },
        expect.objectContaining({
          data: {},
          name: DATABASE_BACKUP_JOB_NAME,
          opts: expect.objectContaining({ attempts: 3 }),
        }),
      );
    });

    it('should log registration at info', async () => {
      await service.onModuleInit();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Database-backup repeatable job registered'),
        DatabaseBackupRepeatableService.name,
      );
    });

    it('should include tz in the repeat options when configured', async () => {
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

      expect(upsertJobScheduler).toHaveBeenCalledWith(
        DATABASE_BACKUP_REPEATABLE_JOB_ID,
        { pattern: '0 0 0 * * *', tz: 'America/Los_Angeles' },
        expect.objectContaining({ name: DATABASE_BACKUP_JOB_NAME }),
      );
    });
  });
});
