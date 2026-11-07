/**
 * @description Unit tests for the reaper tick: owner-only, and dry-run unless the env flag says
 * otherwise.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanRunWorktreeReaperService } from '../../services/plan-run-worktree-reaper/plan-run-worktree-reaper.service.ts';
import { PlanRunWorktreeReaperProcessor } from './plan-run-worktree-reaper.processor.ts';
import type { PlanRunWorktreeReaperJob } from './plan-run-worktree-reaper.types.ts';

describe('PlanRunWorktreeReaperProcessor.process', () => {
  const sweep = vi.fn().mockResolvedValue({
    deferred: 0,
    dryRun: true,
    examined: 0,
    nominated: [],
    removed: 0,
  });

  const build = (): PlanRunWorktreeReaperProcessor => {
    return new PlanRunWorktreeReaperProcessor(
      createMock<LoggerService>(),
      createMock<PlanRunWorktreeReaperService>({ sweep }),
    );
  };

  beforeEach(() => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');
    vi.stubEnv('OPENTHROTTLE_WORKTREE_REAPER_DRY_RUN', '');
    sweep.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when this server owns the scheduled jobs', () => {
    it('sweeps as a dry run by default', async () => {
      vi.unstubAllEnvs();
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');

      await build().process(createMock<PlanRunWorktreeReaperJob>());

      expect(sweep).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true }),
      );
    });

    it('removes when the flag is explicitly false', async () => {
      vi.stubEnv('OPENTHROTTLE_WORKTREE_REAPER_DRY_RUN', 'false');

      await build().process(createMock<PlanRunWorktreeReaperJob>());

      expect(sweep).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: false }),
      );
    });
  });

  describe('when this server is not the owner', () => {
    it('skips the tick without sweeping', async () => {
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'false');

      await build().process(createMock<PlanRunWorktreeReaperJob>());

      expect(sweep).not.toHaveBeenCalled();
    });
  });
});
