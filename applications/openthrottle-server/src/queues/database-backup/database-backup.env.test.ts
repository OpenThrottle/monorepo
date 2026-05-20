import { afterEach, describe, expect, test } from 'vitest';
import {
  DATABASE_BACKUP_DEFAULT_CRON_PATTERN,
  DATABASE_BACKUP_DEFAULT_JOB_TIMEOUT_MS,
  getDatabaseBackupWorkspaceRoot,
  resolveDatabaseBackupSchedule,
} from './database-backup.env';

const ENV_KEYS = [
  'DATABASE_BACKUP_CRON',
  'DATABASE_BACKUP_TZ',
  'DATABASE_BACKUP_ENABLED',
  'DATABASE_BACKUP_JOB_TIMEOUT_MS',
  'WORKSPACE_ROOT',
] as const;

function clearEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe('resolveDatabaseBackupSchedule', () => {
  afterEach(() => {
    clearEnv();
  });

  describe('when DATABASE_BACKUP_CRON is unset', () => {
    test('returns disabled', () => {
      const result = resolveDatabaseBackupSchedule();
      expect(result.enabled).toBe(false);
      if (!result.enabled) {
        expect(result.reason).toContain('DATABASE_BACKUP_CRON');
      }
    });
  });

  describe('when DATABASE_BACKUP_CRON is set', () => {
    test('returns enabled config with pattern and defaults', () => {
      process.env.DATABASE_BACKUP_CRON = DATABASE_BACKUP_DEFAULT_CRON_PATTERN;
      const result = resolveDatabaseBackupSchedule();
      expect(result.enabled).toBe(true);
      if (result.enabled) {
        expect(result.cronPattern).toBe('0 0 0 * * *');
        expect(result.tz).toBeUndefined();
        expect(result.jobTimeoutMs).toBe(
          DATABASE_BACKUP_DEFAULT_JOB_TIMEOUT_MS,
        );
        expect(result.repeatJobId).toBe(
          'openthrottle-database-backup-repeatable',
        );
      }
    });

    test('includes tz when DATABASE_BACKUP_TZ is set', () => {
      process.env.DATABASE_BACKUP_CRON = '0 0 0 * * *';
      process.env.DATABASE_BACKUP_TZ = 'America/Los_Angeles';
      const result = resolveDatabaseBackupSchedule();
      expect(result.enabled).toBe(true);
      if (result.enabled) {
        expect(result.tz).toBe('America/Los_Angeles');
      }
    });

    test('returns disabled when DATABASE_BACKUP_ENABLED is false', () => {
      process.env.DATABASE_BACKUP_CRON = '0 0 0 * * *';
      process.env.DATABASE_BACKUP_ENABLED = 'false';
      const result = resolveDatabaseBackupSchedule();
      expect(result.enabled).toBe(false);
    });

    test('uses custom job timeout when valid', () => {
      process.env.DATABASE_BACKUP_CRON = '0 0 0 * * *';
      process.env.DATABASE_BACKUP_JOB_TIMEOUT_MS = '60000';
      const result = resolveDatabaseBackupSchedule();
      if (result.enabled) {
        expect(result.jobTimeoutMs).toBe(60_000);
      }
    });
  });
});

describe('getDatabaseBackupWorkspaceRoot', () => {
  afterEach(() => {
    clearEnv();
  });

  test('prefers WORKSPACE_ROOT when set', () => {
    process.env.WORKSPACE_ROOT = '/repo/root';
    expect(getDatabaseBackupWorkspaceRoot()).toBe('/repo/root');
  });

  test('falls back to process.cwd()', () => {
    expect(getDatabaseBackupWorkspaceRoot()).toBe(process.cwd());
  });
});
