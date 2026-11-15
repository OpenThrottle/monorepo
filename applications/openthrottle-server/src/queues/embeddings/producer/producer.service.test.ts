import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { describe, expect, test, vi } from 'vitest';

import type { EmbeddingsJobData } from '../embeddings.types.ts';
import { EmbeddingsProducerService } from './producer.service.ts';

function setup(): {
  readonly addBulk: ReturnType<
    typeof vi.fn<Queue<EmbeddingsJobData>['addBulk']>
  >;
  readonly producer: EmbeddingsProducerService;
} {
  const addBulk = vi.fn<Queue<EmbeddingsJobData>['addBulk']>(() => {
    return Promise.resolve([]);
  });
  const producer = new EmbeddingsProducerService(
    createMock<LoggerService>(),
    createMock<Queue<EmbeddingsJobData>>({ addBulk }),
  );

  return { addBulk, producer };
}

describe('EmbeddingsProducerService.enqueue', () => {
  test('carries the reconciler backfill marker into the job payload', async () => {
    const { addBulk, producer } = setup();

    await producer.enqueue([{ backfill: true, entity: 'plan', id: 'p1' }]);

    expect(addBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        data: { backfill: true, entity: 'plan', id: 'p1' },
        opts: expect.objectContaining({ jobId: 'plan.p1' }),
      }),
    ]);
  });

  test('leaves ordinary writes unmarked', async () => {
    const { addBulk, producer } = setup();

    await producer.enqueue([{ entity: 'task', id: 't1' }]);

    expect(addBulk).toHaveBeenCalledWith([
      expect.objectContaining({ data: { entity: 'task', id: 't1' } }),
    ]);
  });
});
