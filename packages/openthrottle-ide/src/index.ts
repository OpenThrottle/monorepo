export type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from './config/workspace-config.js';
export {
  DEFAULT_EXCLUDE_GLOBS,
  resolveWorkspaceConfig,
} from './config/workspace-config.js';

export type { SearchMatch, SearchOptions } from './data/search.js';
export { searchText } from './data/search.js';

export type {
  DefinitionLocation,
  ExportedSymbol,
  ListExportsOptions,
  ReferenceLocation,
  SymbolName,
  SymbolPosition,
  SymbolTarget,
} from './data/symbols.js';
export { findDefinition, findReferences, listExports } from './data/symbols.js';

export type { LoadProjectOptions } from './data/ts-project.js';
export { loadProject, resetProjectCache } from './data/ts-project.js';

export type { WorkspaceFileHash } from './data/workspace.js';
export { hashWorkspace, listFiles } from './data/workspace.js';

export { hashContent, hashFile } from './utils/hash.js';
export { runRipgrep, workspaceRipgrepArgs } from './utils/ripgrep.js';
