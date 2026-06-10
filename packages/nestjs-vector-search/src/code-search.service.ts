import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  createEmbeddingsProvider,
  indexWorkspace,
  semanticSearch,
} from '@openthrottle/openthrottle-ide';
import type {
  IndexWorkspaceResult,
  SemanticMatch,
} from '@openthrottle/openthrottle-ide';
import { CodeVectorStore } from './code-vector-store';

/** Default number of matches returned by {@link CodeSearchService.codeSemanticSearch}. */
const DEFAULT_SEARCH_TOP_K = 10;

/**
 * @description Orchestrates code semantic search by running the `@openthrottle/openthrottle-ide`
 * engine server-side: it pairs the engine's env-driven {@link createEmbeddingsProvider} with the
 * pgvector {@link CodeVectorStore} so `indexWorkspace` / `semanticSearch` persist to and read from
 * `code_embeddings`. Workspaces are addressed by their absolute filesystem root (resolved from a
 * registered repository by the caller).
 */
@Injectable()
export class CodeSearchService {
  constructor(
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
    const provider = createEmbeddingsProvider();
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
   * True when an embeddings provider is configured (OpenAI `OPENAI_API_KEY`, or Ollama
   * `OLLAMA_BASE_URL` / `OLLAMA_EMBEDDING_MODEL`). Mirrors the engine's provider selection and drives
   * the UI's `unavailable` state — callers should check this before indexing/searching.
   */
  isProviderConfigured(): boolean {
    return (
      Boolean(process.env.OPENAI_API_KEY?.trim()) ||
      Boolean(process.env.OLLAMA_BASE_URL?.trim()) ||
      Boolean(process.env.OLLAMA_EMBEDDING_MODEL?.trim())
    );
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
    const provider = createEmbeddingsProvider();
    return semanticSearch(
      trimmed,
      { root: workspaceRoot },
      { provider, store: this.store, topK },
    );
  }
}
