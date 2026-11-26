import { readFile } from 'node:fs/promises';

import { toErrorMessage } from '@openthrottle/nodejs-utils';

import type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from '../config/workspace-config.ts';
import {
  resolveInsideRoot,
  resolveWorkspaceConfig,
} from '../config/workspace-config.ts';
import type { ChunkOptions, CodeChunk } from './chunk.ts';
import { chunkFile, chunkWorkspace } from './chunk.ts';
import type { EmbeddingsProvider } from './embeddings.ts';
import type { SnapshotDiff } from './workspace.ts';

/** A {@link CodeChunk} paired with its embedding vector, ready to persist. */
export interface StoredChunk {
  /** The chunk being stored. */
  chunk: CodeChunk;
  /** The chunk content's embedding vector. */
  embedding: number[];
}

/**
 * The persistence boundary for code-chunk vectors. Per the design spike,
 * openthrottle-ide owns this interface and ships a pgvector-backed
 * implementation against the `code_embeddings` table; tests pass an in-memory
 * stub. Every method is scoped by `workspaceRoot` so one store can serve many
 * workspaces (the `workspace_root` column).
 *
 * @public
 */
export interface VectorStore {
  /** Remove every stored chunk for a workspace (used by a full re-index). */
  clear: (workspaceRoot: string) => Promise<void>;
  /** Remove every chunk belonging to the given workspace-relative file paths. */
  deleteByPaths: (workspaceRoot: string, paths: string[]) => Promise<void>;
  /**
   * Return the `topK` chunks nearest to `embedding` for a workspace, each with
   * a similarity score (higher is closer). The pgvector implementation maps
   * cosine distance to a `[0, 1]` similarity (`1 - (embedding <=> query)`).
   */
  query: (
    workspaceRoot: string,
    embedding: number[],
    topK: number,
  ) => Promise<VectorMatch[]>;
  /** Insert or replace chunks (keyed by `chunk.id`) for a workspace. */
  upsert: (workspaceRoot: string, records: StoredChunk[]) => Promise<void>;
}

/** A stored chunk returned by {@link VectorStore.query}, with its similarity score. */
export interface VectorMatch {
  /** The matched chunk. */
  chunk: CodeChunk;
  /** Similarity score; higher is a closer match. */
  score: number;
}

/** Options controlling {@link indexWorkspace}. */
export interface IndexWorkspaceOptions extends ChunkOptions {
  /**
   * When provided, run in incremental mode: only `added`/`changed` files are
   * re-chunked and re-embedded, and `changed`/`removed` files have their stale
   * vectors deleted first. Omit for a full re-index (clears the workspace, then
   * indexes every tracked file). Pair with the watch layer's `diffSnapshots`.
   */
  diff?: SnapshotDiff;
  /** Texts embedded per provider request. Defaults to {@link DEFAULT_EMBEDDING_BATCH_SIZE}. */
  embeddingBatchSize?: number;
  /** Produces embeddings for chunk content. */
  provider: EmbeddingsProvider;
  /**
   * Stops the run between embedding batches: once aborted, the next batch is not started and the
   * run rejects with the signal's reason. The batch in flight finishes, so an abort lands within
   * one provider request.
   */
  signal?: AbortSignal;
  /** Where vectors are persisted. */
  store: VectorStore;
}

/**
 * A chunk {@link indexWorkspace} left out because embedding or storing it failed on its own.
 *
 * @public
 */
export interface SkippedChunk {
  /** 1-based inclusive last line of the chunk. */
  readonly endLine: number;
  /** Workspace-relative POSIX path of the chunk's file. */
  readonly path: string;
  /** The provider's or store's error message. */
  readonly reason: string;
  /** 1-based first line of the chunk. */
  readonly startLine: number;
}

/** Outcome of an {@link indexWorkspace} run. */
export interface IndexWorkspaceResult {
  /** Number of files whose vectors were deleted (removed, plus changed in incremental mode). */
  deletedPaths: number;
  /** Number of chunks embedded and upserted. */
  embedded: number;
  /** Chunks left out because they failed on their own; the rest of the run went on without them. */
  readonly skipped: readonly SkippedChunk[];
}

/** Default number of chunk texts embedded per provider request. */
export const DEFAULT_EMBEDDING_BATCH_SIZE = 64;

/**
 * Chunk, embed, and persist a workspace's source into the vector store.
 *
 * Full mode (no `diff`): clears the workspace's vectors, then chunks every
 * tracked file and upserts their embeddings. Incremental mode (`diff` given):
 * deletes vectors for `changed` + `removed` files, then re-chunks and re-embeds
 * only `added` + `changed` files — so unchanged code is never re-embedded.
 * Chunks are keyed by their content-derived id, so an upsert of unchanged
 * content is idempotent.
 *
 * Embeddings and storage are injected ({@link IndexWorkspaceOptions}), so this
 * runs against mocks in tests with no live model or database.
 *
 * @public
 */
export async function indexWorkspace(
  config: WorkspaceConfig,
  options: IndexWorkspaceOptions,
): Promise<IndexWorkspaceResult> {
  const resolved = resolveWorkspaceConfig(config);
  const { diff, provider, signal, store } = options;
  const batchSize = options.embeddingBatchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE;
  const chunkOptions: ChunkOptions = { windowLines: options.windowLines };

  if (diff === undefined) {
    await store.clear(resolved.root);
    const chunks = await chunkWorkspace(config, chunkOptions);
    const { embedded, skipped } = await embedAndUpsert(resolved.root, chunks, {
      batchSize,
      provider,
      signal,
      store,
    });
    return { deletedPaths: 0, embedded, skipped };
  }

  const stalePaths = [...diff.changed, ...diff.removed];
  if (stalePaths.length > 0) {
    await store.deleteByPaths(resolved.root, stalePaths);
  }

  const targetPaths = [...diff.added, ...diff.changed];
  const chunks = await chunkPaths(resolved, targetPaths, chunkOptions);
  const { embedded, skipped } = await embedAndUpsert(resolved.root, chunks, {
    batchSize,
    provider,
    signal,
    store,
  });

  return { deletedPaths: stalePaths.length, embedded, skipped };
}

/** Read and chunk a specific set of workspace-relative paths (incremental mode). */
async function chunkPaths(
  resolved: ResolvedWorkspaceConfig,
  paths: string[],
  options: ChunkOptions,
): Promise<CodeChunk[]> {
  const perFile = await Promise.all(
    paths.map(async (path) => {
      // FS-scoping boundary: skip caller-supplied diff paths that escape the
      // workspace root (absolute segments or `../` traversal) before any read.
      const absolutePath = resolveInsideRoot(resolved, path);
      if (absolutePath === undefined) {
        return [];
      }

      try {
        const content = await readFile(absolutePath, 'utf8');
        return chunkFile(path, content, options);
      } catch {
        // The file vanished between the diff and the read; treat as nothing.
        return [];
      }
    }),
  );

  return perFile.flat();
}

/** What {@link embedAndUpsert} stored and what it left out. */
interface EmbedAndUpsertResult {
  readonly embedded: number;
  readonly skipped: readonly SkippedChunk[];
}

/**
 * Embed one batch and upsert it. Throws when the provider or the store fails, or the provider
 * returns a vector count that does not match the batch.
 */
async function embedAndUpsertBatch(
  workspaceRoot: string,
  batch: CodeChunk[],
  provider: EmbeddingsProvider,
  store: VectorStore,
): Promise<void> {
  const embeddings = await provider.embed(batch.map((chunk) => chunk.content));
  // A provider returning fewer vectors than chunks would otherwise store
  // `undefined` as an embedding — a row that matches nothing and is
  // indistinguishable from a real one. Refuse the batch rather than fall back.
  if (embeddings.length !== batch.length) {
    throw new Error(
      `Embeddings provider returned ${embeddings.length} vectors for a batch of ${batch.length} chunks`,
    );
  }
  const records = batch.map((chunk, index) => {
    const embedding = embeddings[index];
    if (embedding === undefined) {
      throw new Error(
        `Embeddings provider returned no vector at index ${index}`,
      );
    }
    return { chunk, embedding };
  });
  await store.upsert(workspaceRoot, records);
}

/**
 * Retry a failed batch one chunk at a time, so a single chunk the provider or store rejects is
 * skipped instead of failing the run. When every chunk of a multi-chunk batch fails, the cause is
 * not one chunk (the provider or the database is down), so the batch's error is rethrown.
 */
async function retryChunkByChunk(
  workspaceRoot: string,
  batch: CodeChunk[],
  batchError: unknown,
  provider: EmbeddingsProvider,
  store: VectorStore,
): Promise<EmbedAndUpsertResult> {
  const skipped: SkippedChunk[] = [];

  await batch.reduce(async (previous, chunk) => {
    await previous;
    try {
      await embedAndUpsertBatch(workspaceRoot, [chunk], provider, store);
    } catch (error) {
      skipped.push({
        endLine: chunk.endLine,
        path: chunk.path,
        reason: toErrorMessage(error),
        startLine: chunk.startLine,
      });
    }
  }, Promise.resolve());

  if (batch.length > 1 && skipped.length === batch.length) {
    throw batchError;
  }

  return { embedded: batch.length - skipped.length, skipped };
}

/** How {@link embedAndUpsert} embeds and where it stores. */
interface EmbedAndUpsertOptions {
  readonly batchSize: number;
  readonly provider: EmbeddingsProvider;
  readonly signal: AbortSignal | undefined;
  readonly store: VectorStore;
}

/**
 * Embed chunk content in fixed-size batches and upsert each batch. Batches run
 * sequentially (chained, not a bare loop) to bound provider concurrency. A batch
 * that fails is retried chunk by chunk ({@link retryChunkByChunk}). An aborted
 * `signal` stops it before the next batch.
 */
async function embedAndUpsert(
  workspaceRoot: string,
  chunks: CodeChunk[],
  options: EmbedAndUpsertOptions,
): Promise<EmbedAndUpsertResult> {
  const { batchSize, provider, signal, store } = options;
  const batches: CodeChunk[][] = [];
  for (let start = 0; start < chunks.length; start += batchSize) {
    batches.push(chunks.slice(start, start + batchSize));
  }

  const embedBatch = async (
    batch: CodeChunk[],
  ): Promise<EmbedAndUpsertResult> => {
    try {
      await embedAndUpsertBatch(workspaceRoot, batch, provider, store);
      return { embedded: batch.length, skipped: [] };
    } catch (error) {
      return retryChunkByChunk(workspaceRoot, batch, error, provider, store);
    }
  };
  const empty: EmbedAndUpsertResult = { embedded: 0, skipped: [] };

  return batches.reduce(async (previous, batch) => {
    const total = await previous;
    signal?.throwIfAborted();
    const outcome = await embedBatch(batch);

    return {
      embedded: total.embedded + outcome.embedded,
      skipped: [...total.skipped, ...outcome.skipped],
    };
  }, Promise.resolve(empty));
}

/** A semantic search hit: where the match is, how close it is, and its text. */
export interface SemanticMatch {
  /** The matched chunk's raw source text. */
  content: string;
  /** 1-based inclusive last line of the match. */
  endLine: number;
  /** Workspace-relative POSIX path of the matched file. */
  path: string;
  /** Similarity score; higher is a closer match. */
  score: number;
  /** 1-based first line of the match. */
  startLine: number;
}

/** Options controlling {@link semanticSearch}. */
export interface SemanticSearchOptions {
  /** Produces the query embedding (the same client used to index). */
  provider: EmbeddingsProvider;
  /** Where vectors are queried from. */
  store: VectorStore;
  /** Maximum number of matches to return. Defaults to {@link DEFAULT_TOP_K}. */
  topK?: number;
}

/** Default number of matches returned by {@link semanticSearch}. */
export const DEFAULT_TOP_K = 10;

/**
 * Run a top-k semantic search over a workspace's indexed code. Embeds the query
 * with the same provider used to index, runs a vector similarity search against
 * the store, and returns matches sorted by descending similarity. Returns an
 * empty array when the provider yields no embedding for the query.
 *
 * @public
 */
export async function semanticSearch(
  query: string,
  config: WorkspaceConfig,
  options: SemanticSearchOptions,
): Promise<SemanticMatch[]> {
  const resolved = resolveWorkspaceConfig(config);
  const { provider, store } = options;
  const topK = options.topK ?? DEFAULT_TOP_K;

  const [embedding] = await provider.embed([query]);
  if (embedding === undefined) {
    return [];
  }

  const matches = await store.query(resolved.root, embedding, topK);

  return matches
    .map((match) => ({
      content: match.chunk.content,
      endLine: match.chunk.endLine,
      path: match.chunk.path,
      score: match.score,
      startLine: match.chunk.startLine,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
