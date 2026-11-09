/**
 * @description Unit tests for the reaper's repeatable registration: owner-only.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { Job, Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanRunWorktreeReaperRepeatableService } from './repeatable.service.ts';

describe('PlanRunWorktreeReaperRepeatableService.onModuleInit', () => {
  const add = vi.fn(async () => createMock<Job>({ repeatJobKey: 'key' }));

  const build = (): PlanRunWorktreeReaperRepeatableService => {
    return new PlanRunWorktreeReaperRepeatableService(
      createMock<Queue>({ add }),
      createMock<LoggerService>(),
    );
  };

  beforeEach(() => {
    add.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers the repeatable sweep on the owning server', async () => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');

    await build().onModuleInit();

    expect(add).toHaveBeenCalledWith(
      'Reap Plan Run Worktrees',
      {},
      expect.objectContaining({ repeat: { pattern: '0 */30 * * * *' } }),
    );
  });

  it('registers nothing on a non-owner (e.g. a shared-DB worktree server)', async () => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
    vi.stubEnv('OT_WORKTREE_DB', 'shared');

    await build().onModuleInit();

    expect(add).not.toHaveBeenCalled();
  });
});
