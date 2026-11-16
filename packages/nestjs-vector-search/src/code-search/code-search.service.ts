import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { EmbeddingInputType } from '@openthrottle/node-client';
import { resolveCodeEmbeddingPolicy } from '@openthrottle/node-client';
import type {
  EmbeddingsProvider,
  IndexWorkspaceResult,
  SemanticMatch,
} from '@openthrottle/openthrottle-ide';
import {
  diffSnapshots,
  hashWorkspace,
  indexWorkspace,
  semanticSearch,
} from '@openthrottle/openthrottle-ide';

import { CODE_EMBEDDER } from '../code-embedder/code-embedder.token.ts';
import type { CodeEmbedder } from '../code-embedder/code-embedder.types.ts';
import { CodeSnapshotStore } from '../code-snapshot-store/code-snapshot-store.service.ts';
import { CodeVectorStore } from '../code-vector-store/code-vector-store.service.ts';

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
 * engine server-side over the host's single embedder ({@link CODE_EMBEDDER}) and the pgvector
 * {@link CodeVectorStore}, so `indexWorkspace` / `semanticSearch` persist to and read from
 * `code_embeddings`. Workspaces are addressed by their absolute filesystem root (resolved from a
 * registered repository by the caller).
 */
@Injectable()
export class CodeSearchService {
  constructor(
    @Inject(CODE_EMBEDDER) private readonly embedder: CodeEmbedder,
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
    const refusal = this.codeIndexingRefusal();

    if (refusal !== null) {
      throw new Error(refusal);
    }

    const provider = this.providerFor('document');
    const config = { root: workspaceRoot };

    const [priorSnapshot, nextSnapshot] = await Promise.all([
      this.snapshotStore.load(workspaceRoot),
      hashWorkspace(config),
    ]);

    const runIndex = async (): Promise<IndexWorkspaceResult> => {
      if (priorSnapshot === null) {
        return indexWorkspace(config, { provider, store: this.store });
      }

      return indexWorkspace(config, {
        diff: diffSnapshots(priorSnapshot, nextSnapshot),
        provider,
        store: this.store,
      });
    };
    const result = await runIndex();

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
   * True when the embedder can embed: its config resolved and its column/dimension check passed.
   * A transient provider error still counts — the embedder recovers on its next success. Drives the
   * UI's `unavailable` state — callers should check this before indexing/searching.
   */
  isProviderConfigured(): boolean {
    const { state } = this.embedder.getStatus();

    return (
      this.embedder.getConfig() !== undefined &&
      state !== 'unconfigured' &&
      state !== 'dimension_mismatch'
    );
  }

  /**
   * Why code may not be embedded under the configured provider, or null when it may. A hosted
   * provider (`openai`, `gemini`) is refused unless `CODE_EMBEDDINGS_ALLOW_HOSTED=true`, because
   * indexing would send every source chunk to that API (OT plan 1c8b9a90). Null too when the
   * embedder has no config — {@link isProviderConfigured} reports that case.
   */
  codeIndexingRefusal(env: NodeJS.ProcessEnv = process.env): string | null {
    const config = this.embedder.getConfig();

    if (config === undefined) {
      return null;
    }

    const policy = resolveCodeEmbeddingPolicy(config.provider, env);

    return policy.allowed ? null : policy.detail;
  }

  /**
   * Natural-language semantic search over a workspace's indexed code. Returns an empty array for a
   * blank query (no embedder call). `topK` is clamped to `[1, MAX_SEARCH_TOP_K]` as defense-in-depth
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
    return semanticSearch(
      trimmed,
      { root: workspaceRoot },
      {
        provider: this.providerFor('query'),
        store: this.store,
        topK: clampTopK(topK),
      },
    );
  }

  /**
   * Adapts the host embedder to the engine's {@link EmbeddingsProvider} seam for one side of the
   * search (stored chunks are `document`s, the search text is a `query` — nomic-embed-text was
   * trained with a prefix per side). The engine has no failure path, so an embed failure throws
   * here with the embedder's reason, which fails the index job or the search request loudly.
   */
  private providerFor(inputType: EmbeddingInputType): EmbeddingsProvider {
    return {
      embed: async (texts: string[]): Promise<number[][]> => {
        const result = await this.embedder.embed(texts, inputType);

        if (!result.ok) {
          throw new Error(`Code embeddings ${result.reason}: ${result.detail}`);
        }

        return [...result.vectors];
      },
    };
  }
}
