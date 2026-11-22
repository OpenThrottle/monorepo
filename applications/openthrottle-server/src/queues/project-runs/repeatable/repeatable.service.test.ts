import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { Job, Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECT_RUNS_RECONCILE_JOB_NAME } from '../project-runs.constants.ts';
import { ProjectRunsRepeatableService } from './repeatable.service.ts';

describe('ProjectRunsRepeatableService.onModuleInit', () => {
  const add = vi.fn(async () => createMock<Job>({ repeatJobKey: 'key' }));

  const build = (): ProjectRunsRepeatableService => {
    return new ProjectRunsRepeatableService(
      createMock<LoggerService>(),
      createMock<Queue>({ add }),
    );
  };

  beforeEach(() => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
    vi.stubEnv('OT_WORKTREE_DB', '');
    add.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when this process owns the repeatables', () => {
    it('registers the every-minute reconcile', async () => {
      await build().onModuleInit();

      expect(add).toHaveBeenCalledWith(
        PROJECT_RUNS_RECONCILE_JOB_NAME,
        { kind: 'reconcile' },
        expect.objectContaining({ repeat: { pattern: '0 * * * * *' } }),
      );
    });
  });

  describe('when a shared-DB worktree runs it', () => {
    it('registers nothing', async () => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');

      await build().onModuleInit();

      expect(add).not.toHaveBeenCalled();
    });
  });
});
