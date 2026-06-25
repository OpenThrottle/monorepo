import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  createEmbeddingsProvider,
  diffSnapshots,
  hashWorkspace,
  indexWorkspace,
  semanticSearch,
} from '@openthrottle/openthrottle-ide';
import type {
  EmbeddingsConfig,
  WorkspaceFileHash,
} from '@openthrottle/openthrottle-ide';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfigService } from './app-config.service';
import { CodeSearchService } from './code-search.service';
import { CodeSnapshotStore } from './code-snapshot-store';
import { CodeVectorStore } from './code-vector-store';

vi.mock('@openthrottle/openthrottle-ide', async (importActual) => {
  const actual =
    await importActual<typeof import('@openthrottle/openthrottle-ide')>();
  return {
    ...actual,
    createEmbeddingsProvider: vi.fn(),
    diffSnapshots: vi.fn(),
    hashWorkspace: vi.fn(),
    indexWorkspace: vi.fn(),
    semanticSearch: vi.fn(),
  };
});

const NEXT_SNAPSHOT: WorkspaceFileHash[] = [
  { hash: 'h-a', path: 'a.ts' },
  { hash: 'h-b2', path: 'b.ts' },
];
const PRIOR_SNAPSHOT: WorkspaceFileHash[] = [
  { hash: 'h-a', path: 'a.ts' },
  { hash: 'h-b1', path: 'b.ts' },
];

const WORKSPACE = '/Users/dev/repo';

/**
 * The service wraps the resolved provider in a dimension guard before handing it to the engine, so
 * the engine receives a delegating wrapper rather than the bare mock. Assert structural shape, not
 * object identity.
 */
const GUARDED_PROVIDER = { embed: expect.any(Function) };

const OPENAI_CONFIG: EmbeddingsConfig = {
  apiKey: 'sk-test',
  baseUrl: 'https://api.openai.com/v1',
  kind: 'openai',
  model: 'text-embedding-3-small',
};

describe('CodeSearchService', () => {
  let appConfig: AppConfigService;
  let store: CodeVectorStore;
  let snapshotStore: CodeSnapshotStore;
  let service: CodeSearchService;
  const provider = { embed: vi.fn() };

  beforeEach(() => {
    vi.mocked(createEmbeddingsProvider).mockReturnValue(provider);
    vi.mocked(hashWorkspace).mockResolvedValue(NEXT_SNAPSHOT);
    appConfig = createMock<AppConfigService>();
    vi.mocked(appConfig.getEmbeddingsConfig).mockReturnValue(OPENAI_CONFIG);
    vi.mocked(appConfig.isEmbeddingsConfigured).mockReturnValue(true);
    store = createMock<CodeVectorStore>();
    snapshotStore = createMock<CodeSnapshotStore>();
    service = new CodeSearchService(
      appConfig,
      createMock<LoggerService>(),
      store,
      snapshotStore,
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
    it('runs a FULL index (no diff) when there is no prior snapshot, then persists the snapshot', async () => {
      const result = { deletedPaths: 0, embedded: 17 };
      vi.mocked(snapshotStore.load).mockResolvedValue(null);
      vi.mocked(indexWorkspace).mockResolvedValue(result);

      const out = await service.indexCodeWorkspace(WORKSPACE);

      expect(createEmbeddingsProvider).toHaveBeenCalledWith(OPENAI_CONFIG);
      // No prior snapshot → full mode: indexWorkspace called WITHOUT a diff.
      expect(indexWorkspace).toHaveBeenCalledWith(
        { root: WORKSPACE },
        { provider: GUARDED_PROVIDER, store },
      );
      expect(diffSnapshots).not.toHaveBeenCalled();
      // Snapshot persisted after a successful index.
      expect(snapshotStore.save).toHaveBeenCalledWith(WORKSPACE, NEXT_SNAPSHOT);
      expect(out).toEqual(result);
    });

    it('runs an INCREMENTAL index with the computed diff when a prior snapshot exists', async () => {
      const diff = { added: [], changed: ['b.ts'], removed: [] };
      const result = { deletedPaths: 1, embedded: 3 };
      vi.mocked(snapshotStore.load).mockResolvedValue(PRIOR_SNAPSHOT);
      vi.mocked(diffSnapshots).mockReturnValue(diff);
      vi.mocked(indexWorkspace).mockResolvedValue(result);

      const out = await service.indexCodeWorkspace(WORKSPACE);

      expect(diffSnapshots).toHaveBeenCalledWith(PRIOR_SNAPSHOT, NEXT_SNAPSHOT);
      // Prior snapshot → incremental mode: indexWorkspace called WITH the diff.
      expect(indexWorkspace).toHaveBeenCalledWith(
        { root: WORKSPACE },
        { diff, provider: GUARDED_PROVIDER, store },
      );
      // Fresh snapshot persisted (becomes the next baseline).
      expect(snapshotStore.save).toHaveBeenCalledWith(WORKSPACE, NEXT_SNAPSHOT);
      expect(out).toEqual(result);
    });

    it('does NOT persist the snapshot when the index fails (baseline unchanged)', async () => {
      vi.mocked(snapshotStore.load).mockResolvedValue(PRIOR_SNAPSHOT);
      vi.mocked(diffSnapshots).mockReturnValue({
        added: [],
        changed: ['b.ts'],
        removed: [],
      });
      vi.mocked(indexWorkspace).mockRejectedValue(new Error('embed failed'));

      await expect(service.indexCodeWorkspace(WORKSPACE)).rejects.toThrow(
        /embed failed/u,
      );
      expect(snapshotStore.save).not.toHaveBeenCalled();
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
      expect(snapshotStore.load).not.toHaveBeenCalled();
    });
  });

  describe('dimension guard', () => {
    it('rejects vectors whose width differs from the column, naming the model and dims', async () => {
      // Drive the real engine so the wrapped provider's embed() actually runs: indexWorkspace
      // invokes the provider, which here yields a 768-dim vector (the nomic-embed-text default).
      vi.mocked(snapshotStore.load).mockResolvedValue(null);
      vi.mocked(appConfig.getEmbeddingsConfig).mockReturnValue({
        baseUrl: 'http://localhost:11434',
        kind: 'ollama',
        model: 'nomic-embed-text',
      });
      vi.mocked(indexWorkspace).mockImplementation(async (_config, options) => {
        await options.provider.embed(['some chunk']);
        return { deletedPaths: 0, embedded: 1 };
      });
      provider.embed.mockResolvedValue([new Array(768).fill(0)]);

      await expect(service.indexCodeWorkspace(WORKSPACE)).rejects.toThrow(
        /nomic-embed-text.*768.*1536|768.*1536/u,
      );
      expect(snapshotStore.save).not.toHaveBeenCalled();
    });

    it('passes vectors of the expected width through unchanged', async () => {
      vi.mocked(snapshotStore.load).mockResolvedValue(null);
      const embedded = [new Array(1536).fill(0.5)];
      vi.mocked(indexWorkspace).mockImplementation(async (_config, options) => {
        const out = await options.provider.embed(['some chunk']);
        expect(out).toEqual(embedded);
        return { deletedPaths: 0, embedded: 1 };
      });
      provider.embed.mockResolvedValue(embedded);

      const out = await service.indexCodeWorkspace(WORKSPACE);
      expect(out).toEqual({ deletedPaths: 0, embedded: 1 });
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
        { provider: GUARDED_PROVIDER, store, topK: 5 },
      );
      expect(out).toEqual(matches);
    });

    it('defaults topK to 10', async () => {
      vi.mocked(semanticSearch).mockResolvedValue([]);
      await service.codeSemanticSearch(WORKSPACE, 'query');
      expect(semanticSearch).toHaveBeenCalledWith(
        'query',
        { root: WORKSPACE },
        { provider: GUARDED_PROVIDER, store, topK: 10 },
      );
    });

    it.each([
      [0, 1],
      [-5, 1],
      [1000, 50],
      [3.9, 3],
    ])(
      'clamps topK %d to %d (defense-in-depth over the resolver)',
      async (input, expected) => {
        vi.mocked(semanticSearch).mockResolvedValue([]);
        await service.codeSemanticSearch(WORKSPACE, 'query', input);
        expect(semanticSearch).toHaveBeenCalledWith(
          'query',
          { root: WORKSPACE },
          { provider: GUARDED_PROVIDER, store, topK: expected },
        );
      },
    );

    it('falls back to the default topK for a non-finite value', async () => {
      vi.mocked(semanticSearch).mockResolvedValue([]);
      await service.codeSemanticSearch(WORKSPACE, 'query', Number.NaN);
      expect(semanticSearch).toHaveBeenCalledWith(
        'query',
        { root: WORKSPACE },
        { provider: GUARDED_PROVIDER, store, topK: 10 },
      );
    });
  });
});
