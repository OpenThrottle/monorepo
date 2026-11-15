import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { Job, Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { EmbeddingsReconcileRepeatableService } from './repeatable.service.ts';

const add = vi.fn(() => {
  return Promise.resolve(createMock<Job>({ repeatJobKey: 'key' }));
});

function service(): EmbeddingsReconcileRepeatableService {
  return new EmbeddingsReconcileRepeatableService(
    createMock<Queue<Record<string, never>>>({ add }),
    createMock<LoggerService>(),
  );
}

describe('EmbeddingsReconcileRepeatableService.onModuleInit', () => {
  beforeEach(() => {
    add.mockClear();
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
    vi.stubEnv('OT_WORKTREE_DB', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when this checkout owns repeatables', () => {
    test('registers the interval repeatable and one boot cycle', async () => {
      vi.stubEnv('EMBEDDINGS_RECONCILE_INTERVAL_MINUTES', '10');

      await service().onModuleInit();

      expect(add).toHaveBeenCalledTimes(2);
      expect(add).toHaveBeenNthCalledWith(
        1,
        'Reconcile Embeddings',
        {},
        expect.objectContaining({ repeat: { every: 600_000 } }),
      );
      expect(add).toHaveBeenNthCalledWith(
        2,
        'Reconcile Embeddings',
        {},
        expect.objectContaining({
          delay: 30_000,
          jobId: 'embeddings-reconcile-boot',
          removeOnComplete: true,
        }),
      );
    });
  });

  describe('when this is a shared-DB worktree', () => {
    test('registers nothing', async () => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');

      await service().onModuleInit();

      expect(add).not.toHaveBeenCalled();
    });
  });
});
