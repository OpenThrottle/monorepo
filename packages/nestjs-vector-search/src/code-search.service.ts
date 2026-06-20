import { Injectable } from '@nestjs/common';
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
   * blank query (no provider call).
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
      { provider, store: this.store, topK },
    );
  }

  /**
   * Resolve config and build the provider, failing loudly at this edge with a clear message when
   * embeddings are not configured — rather than letting a missing key throw from deep in the engine.
   */
  private resolveProvider(): EmbeddingsProvider {
    const config: EmbeddingsConfig = this.appConfig.getEmbeddingsConfig();
    if (config.kind === 'openai' && !config.apiKey) {
      throw new Error(
        'Embeddings are not configured: set OPENAI_API_KEY, or configure Ollama via OLLAMA_BASE_URL / OLLAMA_EMBEDDING_MODEL.',
      );
    }
    return createEmbeddingsProvider(config);
  }
}
