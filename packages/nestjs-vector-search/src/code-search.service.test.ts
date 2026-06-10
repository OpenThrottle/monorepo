import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  createEmbeddingsProvider,
  indexWorkspace,
  semanticSearch,
} from '@openthrottle/openthrottle-ide';
import type { EmbeddingsConfig } from '@openthrottle/openthrottle-ide';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfigService } from './app-config.service';
import { CodeSearchService } from './code-search.service';
import { CodeVectorStore } from './code-vector-store';

vi.mock('@openthrottle/openthrottle-ide', async (importActual) => {
  const actual =
    await importActual<typeof import('@openthrottle/openthrottle-ide')>();
  return {
    ...actual,
    createEmbeddingsProvider: vi.fn(),
    indexWorkspace: vi.fn(),
    semanticSearch: vi.fn(),
  };
});

const WORKSPACE = '/Users/dev/repo';

const OPENAI_CONFIG: EmbeddingsConfig = {
  apiKey: 'sk-test',
  baseUrl: 'https://api.openai.com/v1',
  kind: 'openai',
  model: 'text-embedding-3-small',
};

describe('CodeSearchService', () => {
  let appConfig: AppConfigService;
  let store: CodeVectorStore;
  let service: CodeSearchService;
  const provider = { embed: vi.fn() };

  beforeEach(() => {
    vi.mocked(createEmbeddingsProvider).mockReturnValue(provider);
    appConfig = createMock<AppConfigService>();
    vi.mocked(appConfig.getEmbeddingsConfig).mockReturnValue(OPENAI_CONFIG);
    vi.mocked(appConfig.isEmbeddingsConfigured).mockReturnValue(true);
    store = createMock<CodeVectorStore>();
    service = new CodeSearchService(
      appConfig,
      createMock<LoggerService>(),
      store,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isProviderConfigured', () => {
    it('delegates to AppConfigService.isEmbeddingsConfigured', () => {
      vi.mocked(appConfig.isEmbeddingsConfigured).mockReturnValue(true);
      expect(service.isProviderConfigured()).toBe(true);

      vi.mocked(appConfig.isEmbeddingsConfigured).mockReturnValue(false);
      expect(service.isProviderConfigured()).toBe(false);
    });
  });

  describe('indexedChunkCount', () => {
    it('delegates to the store count', async () => {
      vi.mocked(store.count).mockResolvedValue(7);
      expect(await service.indexedChunkCount(WORKSPACE)).toBe(7);
      expect(store.count).toHaveBeenCalledWith(WORKSPACE);
    });
  });

  describe('indexCodeWorkspace', () => {
    it('runs a full index via the engine with the resolved provider + pgvector store', async () => {
      const result = { deletedPaths: 2, embedded: 17 };
      vi.mocked(indexWorkspace).mockResolvedValue(result);

      const out = await service.indexCodeWorkspace(WORKSPACE);

      expect(createEmbeddingsProvider).toHaveBeenCalledWith(OPENAI_CONFIG);
      expect(indexWorkspace).toHaveBeenCalledWith(
        { root: WORKSPACE },
        { provider, store },
      );
      expect(out).toEqual(result);
    });

    it('throws a clear error when OpenAI config has no API key', async () => {
      vi.mocked(appConfig.getEmbeddingsConfig).mockReturnValue({
        ...OPENAI_CONFIG,
        apiKey: undefined,
      });

      await expect(service.indexCodeWorkspace(WORKSPACE)).rejects.toThrow(
        /not configured/u,
      );
      expect(createEmbeddingsProvider).not.toHaveBeenCalled();
    });
  });

  describe('codeSemanticSearch', () => {
    it('returns [] for a blank query without resolving a provider', async () => {
      const matches = await service.codeSemanticSearch(WORKSPACE, '   ');
      expect(matches).toEqual([]);
      expect(semanticSearch).not.toHaveBeenCalled();
      expect(createEmbeddingsProvider).not.toHaveBeenCalled();
    });

    it('delegates a trimmed query to the engine with topK', async () => {
      const matches = [
        { content: 'x', endLine: 2, path: 'a.ts', score: 0.9, startLine: 1 },
      ];
      vi.mocked(semanticSearch).mockResolvedValue(matches);

      const out = await service.codeSemanticSearch(
        WORKSPACE,
        '  find user  ',
        5,
      );

      expect(createEmbeddingsProvider).toHaveBeenCalledWith(OPENAI_CONFIG);
      expect(semanticSearch).toHaveBeenCalledWith(
        'find user',
        { root: WORKSPACE },
        { provider, store, topK: 5 },
      );
      expect(out).toEqual(matches);
    });

    it('defaults topK to 10', async () => {
      vi.mocked(semanticSearch).mockResolvedValue([]);
      await service.codeSemanticSearch(WORKSPACE, 'query');
      expect(semanticSearch).toHaveBeenCalledWith(
        'query',
        { root: WORKSPACE },
        { provider, store, topK: 10 },
      );
    });
  });
});
