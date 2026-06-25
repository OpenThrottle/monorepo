import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  createEmbeddingsProvider,
  diffSnapshots,
  EMBEDDING_DIMENSIONS,
  hashWorkspace,
  indexWorkspace,
  semanticSearch,
} from '@openthrottle/openthrottle-ide';
import type {
  EmbeddingsConfig,
  EmbeddingsProvider,
  IndexWorkspaceResult,
  SemanticMatch,
} from '@openthrottle/openthrottle-ide';
import { AppConfigService } from './app-config.service';
import { CodeSnapshotStore } from './code-snapshot-store';
import { CodeVectorStore } from './code-vector-store';

/** Default number of matches returned by {@link CodeSearchService.codeSemanticSearch}. */
const DEFAULT_SEARCH_TOP_K = 10;

/**
 * Hard upper bound on `topK` enforced inside the service as defense-in-depth. The GraphQL resolver
 * also clamps (`MAX_SEARCH_LIMIT = 50`), but this package is public API consumed elsewhere (e.g. the
 * index/search queue processor), so a `0`/negative/huge `topK` from a future caller must not reach
 * the `LIMIT $3` clause unbounded.
 */
const MAX_SEARCH_TOP_K = 50;

/** Clamp a caller-supplied `topK` to the sane `[1, MAX_SEARCH_TOP_K]` range. */
function clampTopK(topK: number): number {
  if (!Number.isFinite(topK)) {
    return DEFAULT_SEARCH_TOP_K;
  }
  return Math.min(Math.max(1, Math.floor(topK)), MAX_SEARCH_TOP_K);
}

/**
 * @description Orchestrates code semantic search by running the `@openthrottle/openthrottle-ide`
 * engine server-side: it resolves an explicit {@link EmbeddingsConfig} via {@link AppConfigService}
 * and pairs the resulting provider with the pgvector {@link CodeVectorStore} so `indexWorkspace` /
 * `semanticSearch` persist to and read from `code_embeddings`. Workspaces are addressed by their
 * absolute filesystem root (resolved from a registered repository by the caller).
 */
@Injectable()
export class CodeSearchService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly logger: LoggerService,
    private readonly store: CodeVectorStore,
    private readonly snapshotStore: CodeSnapshotStore,
  ) {}

  /**
   * Re-index a workspace's code into `code_embeddings`, incrementally when possible.
   *
   * Loads the prior workspace snapshot (engine `hashWorkspace` output, persisted in
   * `code_index_snapshots`). When one exists, it diffs it against a fresh scan (`diffSnapshots`) and
   * runs the engine in incremental mode — re-embedding only added/changed files and deleting removed
   * ones via the store. With no prior snapshot it falls back to a FULL index (clear + embed every
   * tracked file). The new snapshot is persisted only after a successful index, so a failed run never
   * advances the baseline (which would silently skip files next time).
   */
  async indexCodeWorkspace(
    workspaceRoot: string,
  ): Promise<IndexWorkspaceResult> {
    this.logger.debug(`🧩 indexCodeWorkspace: ${workspaceRoot}`);
    const provider = this.resolveProvider();
    const config = { root: workspaceRoot };

    const [priorSnapshot, nextSnapshot] = await Promise.all([
      this.snapshotStore.load(workspaceRoot),
      hashWorkspace(config),
    ]);

    const result =
      priorSnapshot === null
        ? await indexWorkspace(config, { provider, store: this.store })
        : await indexWorkspace(config, {
            diff: diffSnapshots(priorSnapshot, nextSnapshot),
            provider,
            store: this.store,
          });

    // Persist AFTER a successful index only: if indexWorkspace throws, the baseline is unchanged so
    // the next run re-attempts the same delta instead of skipping the files it failed to embed.
    await this.snapshotStore.save(workspaceRoot, nextSnapshot);
    return result;
  }

  /** Number of indexed code chunks for a workspace (0 means not yet indexed). */
  async indexedChunkCount(workspaceRoot: string): Promise<number> {
    return this.store.count(workspaceRoot);
  }

  /**
   * True when an embeddings provider is usable (OpenAI requires an API key; Ollama does not).
   * Drives the UI's `unavailable` state — callers should check this before indexing/searching.
   */
  isProviderConfigured(): boolean {
    return this.appConfig.isEmbeddingsConfigured();
  }

  /**
   * Natural-language semantic search over a workspace's indexed code. Returns an empty array for a
   * blank query (no provider call). `topK` is clamped to `[1, MAX_SEARCH_TOP_K]` as defense-in-depth
   * so callers other than the resolver can't drive an empty/erroring/unbounded `LIMIT`.
   */
  async codeSemanticSearch(
    workspaceRoot: string,
    query: string,
    topK: number = DEFAULT_SEARCH_TOP_K,
  ): Promise<SemanticMatch[]> {
    const trimmed = query.trim();
    if (trimmed === '') {
      return [];
    }
    const provider = this.resolveProvider();
    return semanticSearch(
      trimmed,
      { root: workspaceRoot },
      { provider, store: this.store, topK: clampTopK(topK) },
    );
  }

  /**
   * Resolve config and build the provider, failing loudly at this edge with a clear message when
   * embeddings are not configured — rather than letting a missing key throw from deep in the engine.
   *
   * The provider is wrapped with a dimension guard so a model whose output width differs from the
   * `code_embeddings.embedding` column (`vector(${EMBEDDING_DIMENSIONS})`) is rejected here with a
   * clear message — naming the model and the expected/actual dims — instead of dying on a cryptic
   * pg error mid-batch. This is the documented failure mode for the default Ollama model
   * (`nomic-embed-text`, 768 dims) when only `OLLAMA_BASE_URL` is set.
   */
  private resolveProvider(): EmbeddingsProvider {
    const config: EmbeddingsConfig = this.appConfig.getEmbeddingsConfig();
    if (config.kind === 'openai' && !config.apiKey) {
      throw new Error(
        'Embeddings are not configured: set OPENAI_API_KEY, or configure Ollama via OLLAMA_BASE_URL / OLLAMA_EMBEDDING_MODEL.',
      );
    }
    return this.withDimensionGuard(createEmbeddingsProvider(config), config);
  }

  /**
   * Wrap a provider so every embedding it returns is validated against {@link EMBEDDING_DIMENSIONS}
   * (the width of the pgvector column). On mismatch it throws with the provider/model and the
   * expected vs actual dimensions, turning an otherwise opaque `expected ${EMBEDDING_DIMENSIONS}
   * dimensions` pg error into an actionable precondition failure at the edge.
   */
  private withDimensionGuard(
    provider: EmbeddingsProvider,
    config: EmbeddingsConfig,
  ): EmbeddingsProvider {
    return {
      embed: async (texts: string[]): Promise<number[][]> => {
        const vectors = await provider.embed(texts);
        for (const vector of vectors) {
          if (vector.length !== EMBEDDING_DIMENSIONS) {
            throw new Error(
              `Embeddings provider "${config.kind}" model "${config.model}" returned ${vector.length}-dimensional vectors, but the code_embeddings column requires ${EMBEDDING_DIMENSIONS}. Configure a ${EMBEDDING_DIMENSIONS}-dimensional embedding model (the default Ollama model nomic-embed-text emits 768).`,
            );
          }
        }
        return vectors;
      },
    };
  }
}
