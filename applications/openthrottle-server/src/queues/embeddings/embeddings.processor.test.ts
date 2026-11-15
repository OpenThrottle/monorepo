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

import type { EmbedderService } from '../../services/embedder/embedder.service.ts';
import { EmbeddingsProcessor } from './embeddings.processor.ts';
import type { EmbedEntityJob } from './embeddings.types.ts';
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

interface Harness {
  readonly embed: ReturnType<typeof vi.fn<() => Promise<EmbedResult>>>;
  readonly processor: EmbeddingsProcessor;
  readonly query: ReturnType<
    typeof vi.fn<(sql: string, params?: unknown[]) => Promise<unknown>>
  >;
}

function harness(options: {
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
  const processor = new EmbeddingsProcessor(
    createMock<LoggerService>(),
    embedder,
    createMock<DataSource>({ query }),
  );

  return { embed, processor, query };
}

function job(): EmbedEntityJob & {
  readonly moveToDelayed: ReturnType<typeof vi.fn>;
} {
  return createMock<
    EmbedEntityJob & { readonly moveToDelayed: ReturnType<typeof vi.fn> }
  >({
    data: { entity: 'plan', id: 'plan-1' },
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
