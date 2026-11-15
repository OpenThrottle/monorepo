import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { resolveEmbeddingConfig } from '@openthrottle/node-client';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { EmbedderService } from '../../services/embedder/embedder.service.ts';
import type { EmbedderStatus } from '../../services/embedder/embedder.types.ts';
import type { EmbeddingsProducerService } from '../embeddings/producer/producer.service.ts';
import { EmbeddingsReconcileProcessor } from './embeddings-reconcile.processor.ts';
import type { EmbeddingsReconcileJob } from './embeddings-reconcile.types.ts';

const configResult = resolveEmbeddingConfig({});

if (!configResult.ok) {
  throw new Error(configResult.detail);
}

const CONFIG = configResult.config;
const FIXED_NOW = new Date('2026-11-15T00:00:00.000Z');

function status(state: EmbedderStatus['state']): EmbedderStatus {
  return {
    checkedAt: FIXED_NOW,
    detail: state === 'ok' ? null : 'why',
    dims: 768,
    model: CONFIG.model,
    provider: 'local',
    state,
  };
}

function ids(count: number, offset = 0): { id: string }[] {
  return Array.from({ length: count }, (_, index) => {
    return {
      id: `00000000-0000-0000-0000-${String(offset + index).padStart(12, '0')}`,
    };
  });
}

function setup(options: {
  readonly configured: boolean;
  readonly pages: Readonly<Record<string, { id: string }[][]>>;
  readonly state: EmbedderStatus['state'];
}): {
  readonly enqueue: ReturnType<
    typeof vi.fn<EmbeddingsProducerService['enqueue']>
  >;
  readonly enqueueCodeChunks: ReturnType<
    typeof vi.fn<EmbeddingsProducerService['enqueueCodeChunks']>
  >;
  readonly processor: EmbeddingsReconcileProcessor;
  readonly query: ReturnType<
    typeof vi.fn<(sql: string, params?: unknown[]) => Promise<unknown>>
  >;
} {
  const remaining = new Map(
    Object.entries(options.pages).map(([table, pages]) => {
      return [table, [...pages]];
    }),
  );
  const query = vi.fn((sql: string) => {
    if (sql.startsWith('DELETE')) {
      return Promise.resolve([[], 0]);
    }

    const table =
      /LEFT JOIN (\w+) e/.exec(sql)?.[1] ??
      /FROM (code_embeddings) c/.exec(sql)?.[1] ??
      '';

    return Promise.resolve(remaining.get(table)?.shift() ?? []);
  });
  const enqueue = vi.fn<EmbeddingsProducerService['enqueue']>((items) => {
    return Promise.resolve(items.length);
  });
  const enqueueCodeChunks = vi.fn<
    EmbeddingsProducerService['enqueueCodeChunks']
  >(() => {
    return Promise.resolve(1);
  });
  const processor = new EmbeddingsReconcileProcessor(
    createMock<LoggerService>(),
    createMock<EmbedderService>({
      getConfig: () => {
        return options.configured ? CONFIG : undefined;
      },
      getStatus: () => {
        return status(options.state);
      },
    }),
    createMock<EmbeddingsProducerService>({ enqueue, enqueueCodeChunks }),
    createMock<DataSource>({ query }),
  );

  return { enqueue, enqueueCodeChunks, processor, query };
}

const JOB = createMock<EmbeddingsReconcileJob>({ id: 'reconcile-1' });

describe('EmbeddingsReconcileProcessor', () => {
  beforeEach(() => {
    vi.stubEnv('EMBEDDINGS_RECONCILE_BATCH_SIZE', '2');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when the embedder is unconfigured', () => {
    test.each([
      [false, 'unconfigured'],
      [true, 'dimension_mismatch'],
    ] as const)(
      'skips the cycle (configured=%s, %s)',
      async (configured, state) => {
        const { enqueue, processor, query } = setup({
          configured,
          pages: {},
          state,
        });

        await expect(processor.process(JOB)).resolves.toMatchObject({
          skipped: true,
        });
        expect(query).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
      },
    );
  });

  describe('when rows are stale', () => {
    test('enqueues them page by page, never more than the batch size per query', async () => {
      const { enqueue, processor, query } = setup({
        configured: true,
        pages: { task_embeddings: [ids(2), ids(2, 2), ids(1, 4)] },
        state: 'ok',
      });

      const summary = await processor.process(JOB);

      expect(summary).toMatchObject({
        entities: { plan: { enqueued: 0 }, task: { enqueued: 5 } },
        skipped: false,
      });
      expect(enqueue).toHaveBeenCalledTimes(3);
      for (const call of enqueue.mock.calls) {
        expect(call[0].length).toBeLessThanOrEqual(2);
      }

      const taskQueries = query.mock.calls.filter((call) => {
        return call[0].includes('LEFT JOIN task_embeddings');
      });

      expect(taskQueries.map((call) => call[1]?.[3])).toEqual([
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000003',
      ]);
      expect(taskQueries[0]?.[1]).toEqual([
        'search_document: ',
        8191,
        CONFIG.model,
        '00000000-0000-0000-0000-000000000000',
        2,
      ]);
    });
  });

  describe('when code chunks are stale', () => {
    test('enqueues one job per page, walking text ids from the empty string', async () => {
      const chunk = (id: string): { id: string } => {
        return { id };
      };
      const { enqueueCodeChunks, processor, query } = setup({
        configured: true,
        pages: {
          code_embeddings: [[chunk('aa'), chunk('bb')], [chunk('cc')]],
        },
        state: 'ok',
      });

      const summary = await processor.process(JOB);

      expect(summary).toMatchObject({
        code: { enqueued: 3, pruned: 0 },
        skipped: false,
      });
      expect(enqueueCodeChunks.mock.calls).toEqual([[['aa', 'bb']], [['cc']]]);

      const codeQueries = query.mock.calls.filter((call) => {
        return call[0].includes('FROM code_embeddings c');
      });

      expect(codeQueries.map((call) => call[1]?.[3])).toEqual(['', 'bb']);
      // Code chunks are never pruned by the reconciler.
      expect(
        query.mock.calls.some((call) => {
          return call[0].includes('DELETE FROM code_embeddings');
        }),
      ).toBe(false);
    });
  });

  describe('when the provider is erroring', () => {
    test('still reconciles, since jobs retry on their own', async () => {
      const { enqueue, processor } = setup({
        configured: true,
        pages: { plan_embeddings: [ids(1)] },
        state: 'provider_error',
      });

      await processor.process(JOB);

      expect(enqueue).toHaveBeenCalledWith([
        { entity: 'plan', id: '00000000-0000-0000-0000-000000000000' },
      ]);
    });
  });
});
