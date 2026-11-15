import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { EmbedResult } from '@openthrottle/node-client';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { EMBEDDING_TABLES } from './embedder.constants.ts';
import { EmbedderService } from './embedder.service.ts';

const { embed } = vi.hoisted(() => {
  return { embed: vi.fn<() => Promise<EmbedResult>>() };
});

vi.mock('@openthrottle/node-client', async (importOriginal) => {
  const mod =
    await importOriginal<typeof import('@openthrottle/node-client')>();

  return {
    ...mod,
    createEmbedder: vi.fn((config: unknown) => {
      return {
        close: vi.fn(() => {
          return Promise.resolve();
        }),
        config,
        embed,
      };
    }),
  };
});

const OK: EmbedResult = {
  dims: 768,
  model: 'nomic-embed-text-v1.5',
  ok: true,
  vectors: [[0.1]],
};

function columns(dims: number): { column_type: string; table_name: string }[] {
  return EMBEDDING_TABLES.map((table) => {
    return { column_type: `vector(${dims})`, table_name: table };
  });
}

function build(dims: number): {
  readonly logger: LoggerService;
  readonly service: EmbedderService;
} {
  const logger = createMock<LoggerService>();
  const dataSource = createMock<DataSource>({
    query: vi.fn(() => {
      return Promise.resolve(columns(dims));
    }),
  });

  return { logger, service: new EmbedderService(logger, dataSource) };
}

beforeEach(() => {
  embed.mockReset();
  vi.stubEnv('EMBEDDING_PROVIDER', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('EmbedderService', () => {
  describe('when the env is refused', () => {
    test('starts unconfigured and embed reports it without calling a provider', async () => {
      vi.stubEnv('EMBEDDING_PROVIDER', 'openai');
      const { logger, service } = build(768);

      expect(service.getStatus()).toMatchObject({
        provider: 'openai',
        state: 'unconfigured',
      });
      await expect(service.embed(['q'], 'query')).resolves.toMatchObject({
        ok: false,
        reason: 'unconfigured',
      });
      await service.probe();
      expect(logger.error).toHaveBeenCalled();
      expect(embed).not.toHaveBeenCalled();
    });
  });

  describe('when the columns are not the model dimension', () => {
    test('probe reports dimension_mismatch and embed refuses', async () => {
      const { logger, service } = build(1536);

      const status = await service.probe();

      expect(status.state).toBe('dimension_mismatch');
      expect(status.detail).toContain('plan_embeddings=vector(1536)');
      expect(logger.error).toHaveBeenCalled();
      await expect(service.embed(['q'], 'query')).resolves.toMatchObject({
        reason: 'dimension_mismatch',
      });
      expect(embed).not.toHaveBeenCalled();
    });
  });

  describe('when the probe embeds', () => {
    test('status is ok with model and dims', async () => {
      embed.mockResolvedValue(OK);
      const { service } = build(768);

      expect(service.getStatus().state).toBe('starting');
      const status = await service.probe();

      expect(status).toMatchObject({
        dims: 768,
        model: 'nomic-embed-text-v1.5',
        provider: 'local',
        state: 'ok',
      });
    });
  });

  describe('when the provider fails and then recovers', () => {
    test('status follows the latest embed', async () => {
      embed.mockResolvedValueOnce({
        detail: 'ollama down',
        ok: false,
        reason: 'provider_error',
      });
      embed.mockResolvedValueOnce(OK);
      const { service } = build(768);

      await service.probe();
      expect(service.getStatus()).toMatchObject({
        detail: 'ollama down',
        state: 'provider_error',
      });

      await service.embed(['q'], 'query');
      expect(service.getStatus()).toMatchObject({ detail: null, state: 'ok' });
    });
  });
});
