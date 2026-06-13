import {
  findDefinition,
  findReferences,
  listExports,
  listFiles,
  searchText,
} from '@openthrottle/openthrottle-ide';
import type {
  SymbolTarget,
  WorkspaceConfig,
} from '@openthrottle/openthrottle-ide';
import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';
import type {
  IdeExportsResult,
  IdeRepositoryRef,
  IdeSearchResult,
  IdeSymbolDetails,
  IdeWorkspaceListing,
} from '@openthrottle/react-router-ide';

/**
 * Server-only adapter over `@openthrottle/openthrottle-ide`. This module is the
 * ONLY place the Node engine runtime is imported; it is dynamically `import()`-ed
 * inside loaders/resource routes (its `.server.ts` suffix keeps it out of the
 * client bundle). Every function is root-parameterized — it takes a resolved
 * `WorkspaceConfig`; it never resolves the root itself, but it does translate
 * the host-truthful root into this process's view when the Docker workspace
 * bridge is active (identity otherwise).
 */

/** Cap on text-search matches returned to the client. */
export const MAX_SEARCH_RESULTS = 200;

/** Repository roots are stored as host paths; the engine needs the local view. */
const toEngineConfig = (config: WorkspaceConfig): WorkspaceConfig => ({
  ...config,
  root: toContainerPath(config.root),
});

/** Cheap (ripgrep) tier: enumerate the workspace's tracked files. */
export const listFilesVM = async (
  config: WorkspaceConfig,
  repository: IdeRepositoryRef,
): Promise<IdeWorkspaceListing> => {
  const paths = await listFiles(toEngineConfig(config));

  return { paths, repository, truncated: false };
};

/** Cheap (ripgrep) tier: run a text search, capped at {@link MAX_SEARCH_RESULTS}. */
export const searchVM = async (
  config: WorkspaceConfig,
  repository: IdeRepositoryRef,
  query: string,
): Promise<IdeSearchResult> => {
  const trimmed = query.trim();

  if (trimmed === '') {
    return { matches: [], query, repository, truncated: false };
  }

  const matches = await searchText(trimmed, toEngineConfig(config), {
    maxResults: MAX_SEARCH_RESULTS,
  });

  return {
    matches,
    query,
    repository,
    truncated: matches.length >= MAX_SEARCH_RESULTS,
  };
};

/** Expensive (ts-morph) tier: enumerate exported symbols. Loaded lazily. */
export const exportsVM = async (
  config: WorkspaceConfig,
  repository: IdeRepositoryRef,
): Promise<IdeExportsResult> => {
  const symbols = await listExports(toEngineConfig(config));

  return { repository, symbols, truncated: false };
};

/** Input identifying the symbol whose definition + references to resolve. */
export interface SymbolTargetInput {
  line?: number;
  name?: string;
  path?: string;
}

/** Expensive (ts-morph) tier: resolve a symbol's definition + references. */
export const symbolTargetVM = async (
  config: WorkspaceConfig,
  repository: IdeRepositoryRef,
  input: SymbolTargetInput,
): Promise<IdeSymbolDetails> => {
  const target: SymbolTarget =
    input.name !== undefined && input.name !== ''
      ? { name: input.name }
      : { column: 1, line: input.line ?? 1, path: input.path ?? '' };

  const engineConfig = toEngineConfig(config);
  const [definitions, references] = await Promise.all([
    findDefinition(engineConfig, target),
    findReferences(engineConfig, target),
  ]);

  return {
    definitions,
    references,
    repository,
    symbol: {
      line: input.line ?? definitions[0]?.line ?? 0,
      name: input.name ?? definitions[0]?.name ?? '',
      path: input.path ?? definitions[0]?.path ?? '',
    },
  };
};
