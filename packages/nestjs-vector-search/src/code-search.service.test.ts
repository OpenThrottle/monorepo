import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  createEmbeddingsProvider,
  indexWorkspace,
  semanticSearch,
} from '@openthrottle/openthrottle-ide';
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

describe('CodeSearchService', () => {
  let store: CodeVectorStore;
  let service: CodeSearchService;
  const provider = { embed: vi.fn() };

  beforeEach(() => {
    vi.mocked(createEmbeddingsProvider).mockReturnValue(provider);
    store = createMock<CodeVectorStore>();
    service = new CodeSearchService(createMock<LoggerService>(), store);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('isProviderConfigured', () => {
    it('is true when OPENAI_API_KEY is set', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      vi.stubEnv('OLLAMA_BASE_URL', '');
      vi.stubEnv('OLLAMA_EMBEDDING_MODEL', '');
      expect(service.isProviderConfigured()).toBe(true);
    });

    it('is true when an Ollama env var is set', () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434');
      expect(service.isProviderConfigured()).toBe(true);
    });

    it('is false when no provider env is set', () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('OLLAMA_BASE_URL', '');
      vi.stubEnv('OLLAMA_EMBEDDING_MODEL', '');
      expect(service.isProviderConfigured()).toBe(false);
    });
  });

  describe('indexCodeWorkspace', () => {
    it('runs a full index via the engine with the provider + pgvector store', async () => {
      const result = { deletedPaths: 2, embedded: 17 };
      vi.mocked(indexWorkspace).mockResolvedValue(result);

      const out = await service.indexCodeWorkspace(WORKSPACE);

      expect(indexWorkspace).toHaveBeenCalledWith(
        { root: WORKSPACE },
        { provider, store },
      );
      expect(out).toEqual(result);
    });
  });

  describe('codeSemanticSearch', () => {
    it('returns [] for a blank query without calling the engine', async () => {
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
