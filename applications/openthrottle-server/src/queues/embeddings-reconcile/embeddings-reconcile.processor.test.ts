import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { resolveEmbeddingConfig } from '@openthrottle/node-client';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { BackgroundActivityRegistryService } from '../../services/background-activity-registry/background-activity-registry.service.ts';
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

interface ActivityMocks {
  readonly finish: ReturnType<
    typeof vi.fn<BackgroundActivityRegistryService['finish']>
  >;
  readonly grow: ReturnType<
    typeof vi.fn<BackgroundActivityRegistryService['grow']>
  >;
  readonly rebase: ReturnType<
    typeof vi.fn<BackgroundActivityRegistryService['rebase']>
  >;
  readonly start: ReturnType<
    typeof vi.fn<BackgroundActivityRegistryService['start']>
  >;
}

function activityMocks(alreadyRunning: boolean): ActivityMocks {
  return {
    finish: vi.fn<BackgroundActivityRegistryService['finish']>(() => {
      return Promise.resolve();
    }),
    grow: vi.fn<BackgroundActivityRegistryService['grow']>(() => {
      return Promise.resolve();
    }),
    rebase: vi.fn<BackgroundActivityRegistryService['rebase']>(() => {
      return Promise.resolve();
    }),
    start: vi.fn<BackgroundActivityRegistryService['start']>(() => {
      return Promise.resolve(!alreadyRunning);
    }),
  };
}

function setup(options: {
  readonly alreadyRunning?: boolean;
  readonly configured: boolean;
  readonly pages: Readonly<Record<string, { id: string }[][]>>;
  readonly state: EmbedderStatus['state'];
}): {
  readonly activities: ActivityMocks;
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
  const activities = activityMocks(options.alreadyRunning ?? false);
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
    createMock<BackgroundActivityRegistryService>(activities),
    createMock<DataSource>({ query }),
  );

  return { activities, enqueue, enqueueCodeChunks, processor, query };
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
        {
          backfill: true,
          entity: 'plan',
          id: '00000000-0000-0000-0000-000000000000',
        },
      ]);
    });
  });

  describe('background activity', () => {
    test('opens one activity per stale source and grows it before each page is enqueued', async () => {
      const { activities, enqueueCodeChunks, processor } = setup({
        configured: true,
        pages: {
          code_embeddings: [[{ id: 'aa' }, { id: 'bb' }], [{ id: 'cc' }]],
        },
        state: 'ok',
      });

      await processor.process(JOB);

      expect(activities.start).toHaveBeenCalledOnce();
      expect(activities.start).toHaveBeenCalledWith({
        id: 'embeddings_backfill:code',
        kind: 'embeddings_backfill',
        label: 'Embedding code chunks',
        total: 0,
      });
      expect(activities.grow.mock.calls).toEqual([
        ['embeddings_backfill:code', 2],
        ['embeddings_backfill:code', 1],
      ]);
      expect(activities.grow.mock.invocationCallOrder[0]).toBeLessThan(
        enqueueCodeChunks.mock.invocationCallOrder[0] ?? 0,
      );
      expect(activities.rebase).not.toHaveBeenCalled();
      expect(activities.finish).not.toHaveBeenCalledWith(
        'embeddings_backfill:code',
      );
    });

    test('re-measures an activity a previous cycle opened instead of growing it', async () => {
      const { activities, processor } = setup({
        alreadyRunning: true,
        configured: true,
        pages: { task_embeddings: [ids(2), ids(1, 2)] },
        state: 'ok',
      });

      await processor.process(JOB);

      expect(activities.grow).not.toHaveBeenCalled();
      expect(activities.rebase).toHaveBeenCalledWith(
        'embeddings_backfill:task',
        3,
      );
    });

    test('finishes every source whose walk found nothing', async () => {
      const { activities, processor } = setup({
        configured: true,
        pages: {},
        state: 'ok',
      });

      await processor.process(JOB);

      expect(activities.start).not.toHaveBeenCalled();
      expect(activities.finish.mock.calls.map(([id]) => id).sort()).toEqual([
        'embeddings_backfill:code',
        'embeddings_backfill:custom_prompt',
        'embeddings_backfill:documentation',
        'embeddings_backfill:plan',
        'embeddings_backfill:task',
      ]);
    });

    test('reports nothing while the embedder is unconfigured', async () => {
      const { activities, processor } = setup({
        configured: false,
        pages: {},
        state: 'unconfigured',
      });

      await processor.process(JOB);

      expect(activities.start).not.toHaveBeenCalled();
      expect(activities.finish).not.toHaveBeenCalled();
    });
  });
});
