import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { EmbedResult } from '@openthrottle/node-client';
import {
  prepareEmbeddingInput,
  resolveEmbeddingConfig,
} from '@openthrottle/node-client';
import { DelayedError } from 'bullmq';
import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { BackgroundActivityRegistryService } from '../../services/background-activity-registry/background-activity-registry.service.ts';
import type { BackgroundActivityProgress } from '../../services/background-activity-registry/background-activity-registry.types.ts';
import type { EmbedderService } from '../../services/embedder/embedder.service.ts';
import { EmbeddingsProcessor } from './embeddings.processor.ts';
import type { EmbeddingsJob, EmbedEntityJob } from './embeddings.types.ts';
import { sha256Hex } from './embeddings.utils.ts';

const configResult = resolveEmbeddingConfig({});

if (!configResult.ok) {
  throw new Error(configResult.detail);
}

const CONFIG = configResult.config;
const CONTENT = 'Plan title\nPlan description';
const CURRENT_HASH = sha256Hex(
  prepareEmbeddingInput(CONFIG, CONTENT, 'document'),
);
const VECTOR = Array.from({ length: 768 }, () => {
  return 0.25;
});

interface ActivityMocks {
  readonly finish: ReturnType<
    typeof vi.fn<BackgroundActivityRegistryService['finish']>
  >;
  readonly progress: ReturnType<
    typeof vi.fn<BackgroundActivityRegistryService['progress']>
  >;
}

function activityMocks(
  progress: BackgroundActivityProgress | null = null,
): ActivityMocks {
  return {
    finish: vi.fn<BackgroundActivityRegistryService['finish']>(() => {
      return Promise.resolve();
    }),
    progress: vi.fn<BackgroundActivityRegistryService['progress']>(() => {
      return Promise.resolve(progress);
    }),
  };
}

interface Harness {
  readonly activities: ActivityMocks;
  readonly embed: ReturnType<typeof vi.fn<() => Promise<EmbedResult>>>;
  readonly processor: EmbeddingsProcessor;
  readonly query: ReturnType<
    typeof vi.fn<(sql: string, params?: unknown[]) => Promise<unknown>>
  >;
}

function harness(options: {
  readonly activities?: ActivityMocks;
  readonly content: string | undefined;
  readonly stored:
    | { readonly content_hash: string; readonly embedding_model: string }
    | undefined;
}): Harness {
  const query = vi.fn((sql: string) => {
    if (sql.includes('AS content FROM')) {
      return Promise.resolve(
        options.content === undefined ? [] : [{ content: options.content }],
      );
    }

    if (sql.startsWith('SELECT content_hash')) {
      return Promise.resolve(options.stored ? [options.stored] : []);
    }

    return Promise.resolve([]);
  });
  const embed = vi.fn<() => Promise<EmbedResult>>(() => {
    return Promise.resolve({
      dims: 768,
      model: CONFIG.model,
      ok: true,
      vectors: [VECTOR],
    });
  });
  const embedder = createMock<EmbedderService>({
    embed,
    getConfig: () => {
      return CONFIG;
    },
  });
  const activities = options.activities ?? activityMocks();
  const processor = new EmbeddingsProcessor(
    createMock<LoggerService>(),
    embedder,
    createMock<BackgroundActivityRegistryService>(activities),
    createMock<DataSource>({ query }),
  );

  return { activities, embed, processor, query };
}

function job(backfill: boolean = false): EmbedEntityJob & {
  readonly moveToDelayed: ReturnType<typeof vi.fn>;
} {
  return createMock<
    EmbedEntityJob & { readonly moveToDelayed: ReturnType<typeof vi.fn> }
  >({
    data: backfill
      ? { backfill: true, entity: 'plan', id: 'plan-1' }
      : { entity: 'plan', id: 'plan-1' },
    id: 'plan.plan-1',
    moveToDelayed: vi.fn(() => {
      return Promise.resolve();
    }),
  });
}

function upsertCall(query: Harness['query']): unknown[] | undefined {
  return query.mock.calls.find((call) => {
    return call[0].includes('INSERT INTO plan_embeddings');
  })?.[1];
}

describe('EmbeddingsProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when the stored hash and model match the current content', () => {
    test('skips embedding', async () => {
      const { embed, processor, query } = harness({
        content: CONTENT,
        stored: { content_hash: CURRENT_HASH, embedding_model: CONFIG.model },
      });

      await expect(processor.process(job(), 'token')).resolves.toEqual({
        outcome: 'unchanged',
      });
      expect(embed).not.toHaveBeenCalled();
      expect(upsertCall(query)).toBeUndefined();
    });
  });

  describe('when the content changed since the stored vector', () => {
    test('re-embeds as a document and upserts model, dims and hash', async () => {
      const { embed, processor, query } = harness({
        content: CONTENT,
        stored: { content_hash: 'old', embedding_model: CONFIG.model },
      });

      await expect(processor.process(job(), 'token')).resolves.toEqual({
        outcome: 'embedded',
      });
      expect(embed).toHaveBeenCalledWith([CONTENT], 'document');
      expect(upsertCall(query)).toEqual([
        'plan-1',
        CONTENT,
        `[${VECTOR.join(',')}]`,
        CONFIG.model,
        768,
        CURRENT_HASH,
      ]);
    });
  });

  describe('when the stored vector came from another model', () => {
    test('re-embeds even though the hash matches', async () => {
      const { embed, processor } = harness({
        content: CONTENT,
        stored: {
          content_hash: CURRENT_HASH,
          embedding_model: 'text-embedding-3-small',
        },
      });

      await processor.process(job(), 'token');

      expect(embed).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the row is gone or empty', () => {
    test.each([undefined, '   '])(
      'removes any stale vector (%s)',
      async (content) => {
        const { embed, processor, query } = harness({
          content,
          stored: undefined,
        });

        await expect(processor.process(job(), 'token')).resolves.toEqual({
          outcome: 'removed',
        });
        expect(query).toHaveBeenCalledWith(
          'DELETE FROM plan_embeddings WHERE plan_id = $1',
          ['plan-1'],
        );
        expect(embed).not.toHaveBeenCalled();
      },
    );
  });

  describe('when the embedder is unconfigured', () => {
    test('re-delays the job instead of failing it', async () => {
      const { embed, processor } = harness({
        content: CONTENT,
        stored: undefined,
      });
      const current = job();

      embed.mockResolvedValue({
        detail: 'no weights',
        ok: false,
        reason: 'unconfigured',
      });

      await expect(processor.process(current, 'token')).rejects.toBeInstanceOf(
        DelayedError,
      );
      expect(current.moveToDelayed).toHaveBeenCalledWith(
        expect.any(Number),
        'token',
      );
    });

    test('does not count a re-delayed backfill job as progress', async () => {
      const { activities, embed, processor } = harness({
        content: CONTENT,
        stored: undefined,
      });

      embed.mockResolvedValue({
        detail: 'no weights',
        ok: false,
        reason: 'unconfigured',
      });

      await expect(
        processor.process(job(true), 'token'),
      ).rejects.toBeInstanceOf(DelayedError);
      expect(activities.progress).not.toHaveBeenCalled();
    });
  });

  describe('background activity', () => {
    test('counts a finished backfill job toward its source', async () => {
      const activities = activityMocks({ done: 3, total: 10 });
      const { processor } = harness({
        activities,
        content: CONTENT,
        stored: { content_hash: CURRENT_HASH, embedding_model: CONFIG.model },
      });

      await processor.process(job(true), 'token');

      expect(activities.progress).toHaveBeenCalledWith(
        'embeddings_backfill:plan',
        1,
      );
      expect(activities.finish).not.toHaveBeenCalled();
    });

    test('finishes the activity once its total is reached', async () => {
      const activities = activityMocks({ done: 10, total: 10 });
      const { processor } = harness({
        activities,
        content: CONTENT,
        stored: { content_hash: CURRENT_HASH, embedding_model: CONFIG.model },
      });

      await processor.process(job(true), 'token');

      expect(activities.finish).toHaveBeenCalledWith(
        'embeddings_backfill:plan',
      );
    });

    test('ignores jobs from ordinary writes', async () => {
      const { activities, processor } = harness({
        content: CONTENT,
        stored: { content_hash: CURRENT_HASH, embedding_model: CONFIG.model },
      });

      await processor.process(job(), 'token');

      expect(activities.progress).not.toHaveBeenCalled();
    });
  });

  describe('when the provider errors', () => {
    test('throws so BullMQ retries with backoff', async () => {
      const { embed, processor } = harness({
        content: CONTENT,
        stored: undefined,
      });
      const current = job();

      embed.mockResolvedValue({
        detail: 'ollama down',
        ok: false,
        reason: 'provider_error',
      });

      await expect(processor.process(current, 'token')).rejects.toThrow(
        'ollama down',
      );
      expect(current.moveToDelayed).not.toHaveBeenCalled();
    });
  });
});

describe('EmbeddingsProcessor code chunks', () => {
  const CHUNK = 'export const answer = 42;';
  const CHUNK_HASH = sha256Hex(
    prepareEmbeddingInput(CONFIG, CHUNK, 'document'),
  );

  interface ChunkRow {
    readonly content: string;
    readonly content_hash: string;
    readonly embedding_model: string | null;
    readonly has_embedding: boolean;
    readonly id: string;
  }

  function codeHarness(
    rows: readonly ChunkRow[],
    activities: ActivityMocks = activityMocks(),
  ): Harness {
    const query = vi.fn((sql: string) => {
      return Promise.resolve(sql.startsWith('SELECT id, content') ? rows : []);
    });
    const embed = vi.fn<() => Promise<EmbedResult>>(() => {
      return Promise.resolve({
        dims: 768,
        model: CONFIG.model,
        ok: true,
        vectors: [VECTOR],
      });
    });
    const processor = new EmbeddingsProcessor(
      createMock<LoggerService>(),
      createMock<EmbedderService>({
        embed,
        getConfig: () => {
          return CONFIG;
        },
      }),
      createMock<BackgroundActivityRegistryService>(activities),
      createMock<DataSource>({ query }),
    );

    return { activities, embed, processor, query };
  }

  function codeJob(): EmbeddingsJob {
    return createMock<EmbeddingsJob>({
      data: { entity: 'code', ids: ['chunk-a', 'chunk-b'] },
      id: 'code.chunk-a',
    });
  }

  test('re-embeds only the stale rows and updates them in place', async () => {
    const { embed, processor, query } = codeHarness([
      {
        content: CHUNK,
        content_hash: 'old-unprefixed-hash',
        embedding_model: null,
        has_embedding: false,
        id: 'chunk-a',
      },
      {
        content: CHUNK,
        content_hash: CHUNK_HASH,
        embedding_model: CONFIG.model,
        has_embedding: true,
        id: 'chunk-b',
      },
    ]);

    await expect(processor.process(codeJob(), 'token')).resolves.toEqual({
      outcome: 'embedded',
    });
    expect(embed).toHaveBeenCalledWith([CHUNK], 'document');

    const update = query.mock.calls.find((call) => {
      return call[0].includes('UPDATE code_embeddings');
    });

    expect(update?.[1]).toEqual([
      ['chunk-a'],
      [`[${VECTOR.join(',')}]`],
      [CHUNK_HASH],
      CONFIG.model,
      768,
    ]);
  });

  test('skips the embedder when every row is current', async () => {
    const { embed, processor } = codeHarness([
      {
        content: CHUNK,
        content_hash: CHUNK_HASH,
        embedding_model: CONFIG.model,
        has_embedding: true,
        id: 'chunk-a',
      },
    ]);

    await expect(processor.process(codeJob(), 'token')).resolves.toEqual({
      outcome: 'unchanged',
    });
    expect(embed).not.toHaveBeenCalled();
  });

  test('throws on a provider error so BullMQ retries', async () => {
    const { embed, processor } = codeHarness([
      {
        content: CHUNK,
        content_hash: 'x',
        embedding_model: null,
        has_embedding: false,
        id: 'chunk-a',
      },
    ]);

    embed.mockResolvedValue({
      detail: 'worker crashed',
      ok: false,
      reason: 'provider_error',
    });

    await expect(processor.process(codeJob(), 'token')).rejects.toThrow(
      /code chunk\(s\) failed: worker crashed/u,
    );
  });

  test('counts every chunk in the page toward the code backfill', async () => {
    const activities = activityMocks({ done: 2, total: 2 });
    const { processor } = codeHarness([], activities);

    await expect(processor.process(codeJob(), 'token')).resolves.toEqual({
      outcome: 'unchanged',
    });
    expect(activities.progress).toHaveBeenCalledWith(
      'embeddings_backfill:code',
      2,
    );
    expect(activities.finish).toHaveBeenCalledWith('embeddings_backfill:code');
  });
});
