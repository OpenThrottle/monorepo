export type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from './config/workspace-config.js';
export {
  DEFAULT_EXCLUDE_GLOBS,
  resolveWorkspaceConfig,
} from './config/workspace-config.js';

export type { ChunkOptions, CodeChunk } from './data/chunk.js';
export {
  chunkFile,
  chunkWorkspace,
  DEFAULT_CHUNK_WINDOW_LINES,
} from './data/chunk.js';

export type {
  EmbeddingsConfig,
  EmbeddingsProvider,
  FetchLike,
} from './data/embeddings.js';
export {
  createEmbeddingsProvider,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MAX_EMBEDDING_CHARS,
} from './data/embeddings.js';

export type { SearchMatch, SearchOptions } from './data/search.js';
export { searchText } from './data/search.js';

export type {
  IndexWorkspaceOptions,
  IndexWorkspaceResult,
  SemanticMatch,
  SemanticSearchOptions,
  StoredChunk,
  VectorMatch,
  VectorStore,
} from './data/semantic.js';
export {
  DEFAULT_EMBEDDING_BATCH_SIZE,
  DEFAULT_TOP_K,
  indexWorkspace,
  semanticSearch,
} from './data/semantic.js';

export type {
  DefinitionLocation,
  ExportedSymbol,
  ListExportsOptions,
  ReferenceLocation,
  SymbolName,
  SymbolPosition,
  SymbolScopeOptions,
  SymbolTarget,
} from './data/symbols.js';
export {
  DEFAULT_MAX_SYMBOL_FILES,
  findDefinition,
  findReferences,
  listExports,
} from './data/symbols.js';

export type { LoadProjectOptions } from './data/ts-project.js';
export { loadProject, resetProjectCache } from './data/ts-project.js';

export type {
  IndexSubscriber,
  WatchEvent,
  WatchEventType,
  WatchHandle,
  WatchHandlers,
  WorkspaceIndex,
} from './data/watch.js';
export {
  createWorkspaceIndex,
  DEFAULT_WATCH_DEBOUNCE_MS,
  watchWorkspace,
} from './data/watch.js';

export type { SnapshotDiff, WorkspaceFileHash } from './data/workspace.js';
export { diffSnapshots, hashWorkspace, listFiles } from './data/workspace.js';

export { hashContent, hashFile } from './utils/hash.js';
export { runRipgrep, workspaceRipgrepArgs } from './utils/ripgrep.js';
