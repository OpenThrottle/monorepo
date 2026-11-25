export {
  DEFAULT_SEMANTIC_EXCLUDE_GLOBS,
  semanticExcludeGlobs,
} from './config/semantic-excludes.ts';
export type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from './config/workspace-config.ts';
export {
  DEFAULT_EXCLUDE_GLOBS,
  resolveWorkspaceConfig,
} from './config/workspace-config.ts';
export type { ChunkOptions, CodeChunk } from './data/chunk.ts';
export {
  chunkFile,
  chunkWorkspace,
  DEFAULT_CHUNK_WINDOW_LINES,
} from './data/chunk.ts';
export type { EmbeddingsProvider } from './data/embeddings.ts';
export type { SearchMatch, SearchOptions } from './data/search.ts';
export { searchText } from './data/search.ts';
export type {
  IndexWorkspaceOptions,
  IndexWorkspaceResult,
  SemanticMatch,
  SemanticSearchOptions,
  SkippedChunk,
  StoredChunk,
  VectorMatch,
  VectorStore,
} from './data/semantic.ts';
export {
  DEFAULT_EMBEDDING_BATCH_SIZE,
  DEFAULT_TOP_K,
  indexWorkspace,
  semanticSearch,
} from './data/semantic.ts';
export type {
  DefinitionLocation,
  ExportedSymbol,
  ListExportsOptions,
  ReferenceLocation,
  SymbolName,
  SymbolPosition,
  SymbolScopeOptions,
  SymbolTarget,
} from './data/symbols.ts';
export {
  DEFAULT_MAX_SYMBOL_FILES,
  findDefinition,
  findReferences,
  listExports,
} from './data/symbols.ts';
export type { LoadProjectOptions } from './data/ts-project.ts';
export { loadProject, resetProjectCache } from './data/ts-project.ts';
export type {
  IndexSubscriber,
  WatchEvent,
  WatchEventType,
  WatchHandle,
  WatchHandlers,
  WorkspaceIndex,
} from './data/watch.ts';
export {
  createWorkspaceIndex,
  DEFAULT_WATCH_DEBOUNCE_MS,
  watchWorkspace,
} from './data/watch.ts';
export type { SnapshotDiff, WorkspaceFileHash } from './data/workspace.ts';
export { diffSnapshots, hashWorkspace, listFiles } from './data/workspace.ts';
export { hashContent, hashFile } from './utils/hash.ts';
export { runRipgrep, workspaceRipgrepArgs } from './utils/ripgrep.ts';
