/**
 * @description Unit tests for the attachments janitor's repeatable registration: owner-only.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { Job, Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AttachmentsJanitorRepeatableService } from './repeatable.service.ts';

describe('AttachmentsJanitorRepeatableService.onModuleInit', () => {
  const add = vi.fn(async () => createMock<Job>({ repeatJobKey: 'key' }));

  const build = (): AttachmentsJanitorRepeatableService => {
    return new AttachmentsJanitorRepeatableService(
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

  it('registers the daily cleanup on the owning server', async () => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');

    await build().onModuleInit();

    expect(add).toHaveBeenCalledWith(
      'Clean Up Chat Attachments',
      {},
      expect.objectContaining({ repeat: { pattern: '0 30 3 * * *' } }),
    );
  });

  it('registers nothing on a non-owner (e.g. a shared-DB worktree server)', async () => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
    vi.stubEnv('OT_WORKTREE_DB', 'shared');

    await build().onModuleInit();

    expect(add).not.toHaveBeenCalled();
  });
});
