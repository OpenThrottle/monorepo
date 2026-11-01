/**
 * @description WorkLedgerHarvestRepeatableService registers its repeatable job only when this checkout owns repeatables: a
 * shared-DB worktree (`OT_WORKTREE_DB=shared`) would otherwise run a duplicate copy against the
 * primary's data. See `resolveRepeatablesOwner`.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { Job, Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkLedgerHarvestRepeatableService } from './work-ledger-harvest-repeatable.service.ts';

const add = vi.fn(async () => createMock<Job>({ repeatJobKey: 'key' }));

describe('WorkLedgerHarvestRepeatableService.onModuleInit', () => {
  let logger: LoggerService;
  let service: WorkLedgerHarvestRepeatableService;

  beforeEach(() => {
    add.mockClear();
    logger = createMock<LoggerService>();
    service = new WorkLedgerHarvestRepeatableService(
      createMock<Queue>({ add }),
      logger,
    );
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when this checkout is a shared-DB worktree (non-owner)', () => {
    beforeEach(() => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');
    });

    it('registers nothing', async () => {
      await service.onModuleInit();

      expect(add).not.toHaveBeenCalled();
    });

    it('logs one line naming the reason', async () => {
      await service.onModuleInit();

      expect(logger.info).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('OT_WORKTREE_DB=shared'),
        WorkLedgerHarvestRepeatableService.name,
      );
    });
  });

  describe.each(['', 'isolated'])(
    'when this checkout owns repeatables (OT_WORKTREE_DB=%j)',
    (marker) => {
      beforeEach(() => {
        vi.stubEnv('OT_WORKTREE_DB', marker);
      });

      it('registers the repeatable job', async () => {
        await service.onModuleInit();

        expect(add).toHaveBeenCalledExactlyOnceWith(
          expect.any(String),
          expect.anything(),
          expect.objectContaining({ repeat: expect.anything() }),
        );
      });
    },
  );

  it('registers on a shared worktree when OT_SCHEDULED_JOBS_OWNER=true overrides the marker', async () => {
    vi.stubEnv('OT_WORKTREE_DB', 'shared');
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');

    await service.onModuleInit();

    expect(add).toHaveBeenCalledOnce();
  });
});
