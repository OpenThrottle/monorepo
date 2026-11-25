import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { EmbeddingConfig } from '@openthrottle/node-client';
import { resolveEmbeddingConfig } from '@openthrottle/node-client';
import type { WorkspaceFileHash } from '@openthrottle/openthrottle-ide';
import {
  diffSnapshots,
  hashWorkspace,
  indexWorkspace,
  semanticExcludeGlobs,
  semanticSearch,
} from '@openthrottle/openthrottle-ide';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CodeEmbedder,
  CodeEmbedderState,
} from '../code-embedder/code-embedder.types.ts';
import type { CodeSnapshotStore } from '../code-snapshot-store/code-snapshot-store.service.ts';
import type { CodeVectorStore } from '../code-vector-store/code-vector-store.service.ts';
import { CodeSearchService } from './code-search.service.ts';

vi.mock('@openthrottle/openthrottle-ide', async (importActual) => {
  const actual =
    await importActual<typeof import('@openthrottle/openthrottle-ide')>();
  return {
    ...actual,
    diffSnapshots: vi.fn(),
    hashWorkspace: vi.fn(),
    indexWorkspace: vi.fn(),
    semanticExcludeGlobs: vi.fn(),
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
const EXCLUDES = ['pnpm-lock.yaml'];
const INDEX_CONFIG = { exclude: EXCLUDES, root: WORKSPACE };

/** The service hands the engine an adapter over the embedder; assert its shape, not identity. */
const ADAPTED_PROVIDER = { embed: expect.any(Function) };

function defaultConfig(): EmbeddingConfig {
  const resolved = resolveEmbeddingConfig({});

  if (!resolved.ok) {
    throw new Error(resolved.detail);
  }

  return resolved.config;
}

const CONFIG = defaultConfig();

function hostedConfig(): EmbeddingConfig {
  const resolved = resolveEmbeddingConfig({
    EMBEDDING_PROVIDER: 'openai',
    OPENAI_API_KEY: 'test-key',
  });

  if (!resolved.ok) {
    throw new Error(resolved.detail);
  }

  return resolved.config;
}

describe('CodeSearchService', () => {
  let embedder: CodeEmbedder;
  let store: CodeVectorStore;
  let snapshotStore: CodeSnapshotStore;
  let service: CodeSearchService;

  const setState = (state: CodeEmbedderState): void => {
    vi.mocked(embedder.getStatus).mockReturnValue({ detail: null, state });
  };

  beforeEach(() => {
    vi.mocked(hashWorkspace).mockResolvedValue(NEXT_SNAPSHOT);
    vi.mocked(semanticExcludeGlobs).mockResolvedValue(EXCLUDES);
    embedder = createMock<CodeEmbedder>();
    vi.mocked(embedder.getConfig).mockReturnValue(CONFIG);
    setState('ok');
    store = createMock<CodeVectorStore>();
    snapshotStore = createMock<CodeSnapshotStore>();
    service = new CodeSearchService(
      embedder,
      createMock<LoggerService>(),
      store,
      snapshotStore,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('codeIndexingRefusal', () => {
    it('is null for a self-hosted provider', () => {
      expect(service.codeIndexingRefusal({})).toBeNull();
    });

    it('is null when the embedder has no config', () => {
      vi.mocked(embedder.getConfig).mockReturnValue(undefined);
      expect(service.codeIndexingRefusal({})).toBeNull();
    });

    it('names the opt-in for a hosted provider without it', () => {
      vi.mocked(embedder.getConfig).mockReturnValue(hostedConfig());
      expect(service.codeIndexingRefusal({})).toContain(
        'CODE_EMBEDDINGS_ALLOW_HOSTED=true',
      );
    });

    it('is null for a hosted provider with the opt-in', () => {
      vi.mocked(embedder.getConfig).mockReturnValue(hostedConfig());
      expect(
        service.codeIndexingRefusal({ CODE_EMBEDDINGS_ALLOW_HOSTED: 'true' }),
      ).toBeNull();
    });
  });

  describe('isProviderConfigured', () => {
    it.each<[CodeEmbedderState, boolean]>([
      ['ok', true],
      ['starting', true],
      ['provider_error', true],
      ['unconfigured', false],
      ['dimension_mismatch', false],
    ])('reports %s as %s', (state, expected) => {
      setState(state);
      expect(service.isProviderConfigured()).toBe(expected);
    });

    it('is false when the embedder has no config', () => {
      vi.mocked(embedder.getConfig).mockReturnValue(undefined);
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
    it('refuses a hosted provider without the opt-in before reading or embedding anything', async () => {
      vi.stubEnv('CODE_EMBEDDINGS_ALLOW_HOSTED', '');
      vi.mocked(embedder.getConfig).mockReturnValue(hostedConfig());

      await expect(service.indexCodeWorkspace(WORKSPACE)).rejects.toThrow(
        'CODE_EMBEDDINGS_ALLOW_HOSTED=true',
      );
      expect(hashWorkspace).not.toHaveBeenCalled();
      expect(indexWorkspace).not.toHaveBeenCalled();
      expect(embedder.embed).not.toHaveBeenCalled();
    });

    it('runs a FULL index (no diff) when there is no prior snapshot, then persists the snapshot', async () => {
      const result = { deletedPaths: 0, embedded: 17, skipped: [] };
      vi.mocked(snapshotStore.load).mockResolvedValue(null);
      vi.mocked(indexWorkspace).mockResolvedValue(result);

      const out = await service.indexCodeWorkspace(WORKSPACE);

      expect(indexWorkspace).toHaveBeenCalledWith(INDEX_CONFIG, {
        provider: ADAPTED_PROVIDER,
        store,
      });
      expect(hashWorkspace).toHaveBeenCalledWith(INDEX_CONFIG);
      expect(diffSnapshots).not.toHaveBeenCalled();
      expect(snapshotStore.save).toHaveBeenCalledWith(WORKSPACE, NEXT_SNAPSHOT);
      expect(out).toEqual(result);
    });

    it('runs an INCREMENTAL index with the computed diff when a prior snapshot exists', async () => {
      const diff = { added: [], changed: ['b.ts'], removed: [] };
      const result = { deletedPaths: 1, embedded: 3, skipped: [] };
      vi.mocked(snapshotStore.load).mockResolvedValue(PRIOR_SNAPSHOT);
      vi.mocked(diffSnapshots).mockReturnValue(diff);
      vi.mocked(indexWorkspace).mockResolvedValue(result);

      const out = await service.indexCodeWorkspace(WORKSPACE);

      expect(diffSnapshots).toHaveBeenCalledWith(PRIOR_SNAPSHOT, NEXT_SNAPSHOT);
      expect(indexWorkspace).toHaveBeenCalledWith(INDEX_CONFIG, {
        diff,
        provider: ADAPTED_PROVIDER,
        store,
      });
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
  });

  describe('embedder adapter', () => {
    it('embeds chunks as documents and hands the vectors to the engine', async () => {
      const vectors = [[0.1, 0.2]];
      vi.mocked(snapshotStore.load).mockResolvedValue(null);
      vi.mocked(embedder.embed).mockResolvedValue({
        dims: 2,
        model: CONFIG.model,
        ok: true,
        vectors,
      });
      vi.mocked(indexWorkspace).mockImplementation(async (_config, options) => {
        expect(await options.provider.embed(['some chunk'])).toEqual(vectors);
        return { deletedPaths: 0, embedded: 1, skipped: [] };
      });

      await service.indexCodeWorkspace(WORKSPACE);

      expect(embedder.embed).toHaveBeenCalledWith(['some chunk'], 'document');
    });

    it('throws the embedder failure reason so the index job fails loudly', async () => {
      vi.mocked(snapshotStore.load).mockResolvedValue(null);
      vi.mocked(embedder.embed).mockResolvedValue({
        detail: 'no weights',
        ok: false,
        reason: 'unconfigured',
      });
      vi.mocked(indexWorkspace).mockImplementation(async (_config, options) => {
        await options.provider.embed(['some chunk']);
        return { deletedPaths: 0, embedded: 1, skipped: [] };
      });

      await expect(service.indexCodeWorkspace(WORKSPACE)).rejects.toThrow(
        /unconfigured: no weights/u,
      );
      expect(snapshotStore.save).not.toHaveBeenCalled();
    });

    it('embeds the search text as a query', async () => {
      vi.mocked(embedder.embed).mockResolvedValue({
        dims: 1,
        model: CONFIG.model,
        ok: true,
        vectors: [[1]],
      });
      vi.mocked(semanticSearch).mockImplementation(
        async (query, _config, options) => {
          await options.provider.embed([query]);
          return [];
        },
      );

      await service.codeSemanticSearch(WORKSPACE, 'find user');

      expect(embedder.embed).toHaveBeenCalledWith(['find user'], 'query');
    });
  });

  describe('codeSemanticSearch', () => {
    it('returns [] for a blank query without calling the embedder', async () => {
      const matches = await service.codeSemanticSearch(WORKSPACE, '   ');
      expect(matches).toEqual([]);
      expect(semanticSearch).not.toHaveBeenCalled();
      expect(embedder.embed).not.toHaveBeenCalled();
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
        { provider: ADAPTED_PROVIDER, store, topK: 5 },
      );
      expect(out).toEqual(matches);
    });

    it('defaults topK to 10', async () => {
      vi.mocked(semanticSearch).mockResolvedValue([]);
      await service.codeSemanticSearch(WORKSPACE, 'query');
      expect(semanticSearch).toHaveBeenCalledWith(
        'query',
        { root: WORKSPACE },
        { provider: ADAPTED_PROVIDER, store, topK: 10 },
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
          { provider: ADAPTED_PROVIDER, store, topK: expected },
        );
      },
    );

    it('falls back to the default topK for a non-finite value', async () => {
      vi.mocked(semanticSearch).mockResolvedValue([]);
      await service.codeSemanticSearch(WORKSPACE, 'query', Number.NaN);
      expect(semanticSearch).toHaveBeenCalledWith(
        'query',
        { root: WORKSPACE },
        { provider: ADAPTED_PROVIDER, store, topK: 10 },
      );
    });
  });
});
