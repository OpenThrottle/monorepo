import { readFile } from 'node:fs/promises';

import type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from '../config/workspace-config.js';
import {
  resolveInsideRoot,
  resolveWorkspaceConfig,
} from '../config/workspace-config.js';
import type { ChunkOptions, CodeChunk } from './chunk.js';
import { chunkFile, chunkWorkspace } from './chunk.js';
import type { EmbeddingsProvider } from './embeddings.js';
import type { SnapshotDiff } from './workspace.js';

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
 * @publicApi
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
  /** Where vectors are persisted. */
  store: VectorStore;
}

/** Outcome of an {@link indexWorkspace} run. */
export interface IndexWorkspaceResult {
  /** Number of files whose vectors were deleted (removed, plus changed in incremental mode). */
  deletedPaths: number;
  /** Number of chunks embedded and upserted. */
  embedded: number;
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
 * @publicApi
 */
export async function indexWorkspace(
  config: WorkspaceConfig,
  options: IndexWorkspaceOptions,
): Promise<IndexWorkspaceResult> {
  const resolved = resolveWorkspaceConfig(config);
  const { diff, provider, store } = options;
  const batchSize = options.embeddingBatchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE;
  const chunkOptions: ChunkOptions = { windowLines: options.windowLines };

  if (diff === undefined) {
    await store.clear(resolved.root);
    const chunks = await chunkWorkspace(config, chunkOptions);
    const embedded = await embedAndUpsert(
      resolved.root,
      chunks,
      provider,
      store,
      batchSize,
    );
    return { deletedPaths: 0, embedded };
  }

  const stalePaths = [...diff.changed, ...diff.removed];
  if (stalePaths.length > 0) {
    await store.deleteByPaths(resolved.root, stalePaths);
  }

  const targetPaths = [...diff.added, ...diff.changed];
  const chunks = await chunkPaths(resolved, targetPaths, chunkOptions);
  const embedded = await embedAndUpsert(
    resolved.root,
    chunks,
    provider,
    store,
    batchSize,
  );

  return { deletedPaths: stalePaths.length, embedded };
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

/**
 * Embed chunk content in fixed-size batches and upsert each batch. Batches run
 * sequentially (chained, not a bare loop) to bound provider concurrency.
 */
async function embedAndUpsert(
  workspaceRoot: string,
  chunks: CodeChunk[],
  provider: EmbeddingsProvider,
  store: VectorStore,
  batchSize: number,
): Promise<number> {
  if (chunks.length === 0) {
    return 0;
  }

  const batches: CodeChunk[][] = [];
  for (let start = 0; start < chunks.length; start += batchSize) {
    batches.push(chunks.slice(start, start + batchSize));
  }

  await batches.reduce(async (previous, batch) => {
    await previous;
    const embeddings = await provider.embed(
      batch.map((chunk) => chunk.content),
    );
    const records = batch.map((chunk, index) => ({
      chunk,
      embedding: embeddings[index],
    }));
    await store.upsert(workspaceRoot, records);
  }, Promise.resolve());

  return chunks.length;
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
 * @publicApi
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
