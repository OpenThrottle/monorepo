import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  DATABASE_BACKUP_DEFAULT_CRON_PATTERN,
  DATABASE_BACKUP_DEFAULT_JOB_TIMEOUT_MS,
  getDatabaseBackupWorkspaceRoot,
  resolveBackupOwnership,
  resolveDatabaseBackupSchedule,
  validateBackupCronPattern,
} from './database-backup.env';

const ENV_KEYS = [
  'DATABASE_BACKUP_CRON',
  'DATABASE_BACKUP_TZ',
  'DATABASE_BACKUP_ENABLED',
  'DATABASE_BACKUP_JOB_TIMEOUT_MS',
  'WORKSPACE_ROOT',
  'OT_BACKUP_OWNER',
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
    beforeEach(() => {
      clearEnv();
    });

    test('returns disabled', () => {
      const result = resolveDatabaseBackupSchedule();
      expect(result.enabled).toBe(false);
      if (!result.enabled) {
        expect(result.reason).toContain('DATABASE_BACKUP_CRON');
      }
    });
  });

  describe('when DATABASE_BACKUP_CRON is set', () => {
    beforeEach(() => {
      // Pin a canonical (non-worktree) root so the ownership gate passes
      // regardless of where the suite runs from.
      process.env.WORKSPACE_ROOT = '/repo/root';
    });

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

describe('validateBackupCronPattern', () => {
  test('accepts a valid 6-field daily pattern', () => {
    expect(validateBackupCronPattern('0 0 0 * * *').ok).toBe(true);
  });

  test('accepts a valid 5-field hourly pattern', () => {
    expect(validateBackupCronPattern('0 * * * *').ok).toBe(true);
  });

  test('rejects the bare "0" from the incident (wrong field count)', () => {
    const result = validateBackupCronPattern('0');
    expect(result.ok).toBe(false);
  });

  test('rejects an every-minute pattern', () => {
    expect(validateBackupCronPattern('* * * * *').ok).toBe(false);
  });

  test('rejects a sub-hourly step pattern', () => {
    expect(validateBackupCronPattern('*/5 * * * *').ok).toBe(false);
  });

  test('rejects a 6-field pattern with a non-fixed seconds field', () => {
    expect(validateBackupCronPattern('*/10 0 0 * * *').ok).toBe(false);
  });

  test('rejects illegal characters', () => {
    expect(validateBackupCronPattern('0 0 0 * * ;rm').ok).toBe(false);
  });
});

describe('resolveBackupOwnership', () => {
  afterEach(() => {
    clearEnv();
  });

  test('a canonical checkout is the owner', () => {
    expect(resolveBackupOwnership('/Users/x/Development/openthrottle')).toEqual(
      {
        owner: true,
      },
    );
  });

  test('a worktree checkout is not the owner by default', () => {
    const result = resolveBackupOwnership(
      '/Users/x/Development/openthrottle-worktrees/feature',
    );
    expect(result.owner).toBe(false);
  });

  test('OT_BACKUP_OWNER=true overrides a worktree path', () => {
    process.env.OT_BACKUP_OWNER = 'true';
    expect(
      resolveBackupOwnership(
        '/Users/x/Development/openthrottle-worktrees/feature',
      ),
    ).toEqual({ owner: true });
  });

  test('OT_BACKUP_OWNER=false makes even a canonical checkout a non-owner', () => {
    process.env.OT_BACKUP_OWNER = 'false';
    const result = resolveBackupOwnership('/Users/x/Development/openthrottle');
    expect(result.owner).toBe(false);
  });
});

describe('resolveDatabaseBackupSchedule cron + ownership gating', () => {
  afterEach(() => {
    clearEnv();
  });

  test('rejects a bad cron as invalid (loud) instead of scheduling', () => {
    process.env.WORKSPACE_ROOT = '/repo/root';
    process.env.DATABASE_BACKUP_CRON = '0';
    const result = resolveDatabaseBackupSchedule();
    expect(result.enabled).toBe(false);
    if (!result.enabled) {
      expect(result.invalid).toBe(true);
      expect(result.reason).toContain('rejected');
    }
  });

  test('rejects an every-minute cron as invalid', () => {
    process.env.WORKSPACE_ROOT = '/repo/root';
    process.env.DATABASE_BACKUP_CRON = '* * * * *';
    const result = resolveDatabaseBackupSchedule();
    expect(result.enabled).toBe(false);
    if (!result.enabled) {
      expect(result.invalid).toBe(true);
    }
  });

  test('a worktree checkout does not register (owner gate), not flagged invalid', () => {
    process.env.WORKSPACE_ROOT =
      '/Users/x/Development/openthrottle-worktrees/feature';
    process.env.DATABASE_BACKUP_CRON = '0 0 0 * * *';
    const result = resolveDatabaseBackupSchedule();
    expect(result.enabled).toBe(false);
    if (!result.enabled) {
      expect(result.invalid).toBeUndefined();
      expect(result.reason).toContain('worktree');
    }
  });

  test('OT_BACKUP_OWNER=true lets a worktree register', () => {
    process.env.WORKSPACE_ROOT =
      '/Users/x/Development/openthrottle-worktrees/feature';
    process.env.OT_BACKUP_OWNER = 'true';
    process.env.DATABASE_BACKUP_CRON = '0 0 0 * * *';
    const result = resolveDatabaseBackupSchedule();
    expect(result.enabled).toBe(true);
  });
});
