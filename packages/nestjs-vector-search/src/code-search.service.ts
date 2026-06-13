import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  createEmbeddingsProvider,
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
  ) {}

  /**
   * Full re-index of a workspace's code into `code_embeddings` (v1: no incremental diff — clears the
   * workspace's vectors, then chunks + embeds + upserts every tracked file).
   */
  async indexCodeWorkspace(
    workspaceRoot: string,
  ): Promise<IndexWorkspaceResult> {
    this.logger.debug(`🧩 indexCodeWorkspace: ${workspaceRoot}`);
    const provider = this.resolveProvider();
    return indexWorkspace(
      { root: workspaceRoot },
      { provider, store: this.store },
    );
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
