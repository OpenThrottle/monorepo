// Serializable view-model + transport boundary for @openthrottle/react-router-ide.
//
// The engine (@openthrottle/openthrottle-ide) is a server-only Node library; this
// package is presentational and client-safe. We therefore import ONLY the engine's
// TYPES (`import type` — erased at compile time, never pulls runtime into the bundle).
//
// The engine's leaf result types are already flat, serializable plain data, so they
// cross the React Router loader -> client boundary untouched and are re-exported here
// verbatim as the canonical leaf view-models — no redefinition, no drift. Components
// type their props against these directly (the generated `<Name>Props` interfaces are
// the seam). Engine leaf data passes through unchanged; no mapping helpers are needed.
//
// This package owns only the ENVELOPE DTOs below — the shapes a developer-app loader
// or resource route produces and multiple components share, carrying UI/transport
// metadata the engine's raw arrays don't (echoed query, truncation flag, and the
// repository/project identity the result was produced for).

import type {
  DefinitionLocation,
  ExportedSymbol,
  ReferenceLocation,
  SearchMatch,
  SemanticMatch,
} from '@openthrottle/openthrottle-ide';

/**
 * Engine leaf result types, re-exported verbatim as the canonical leaf view-models.
 * @publicApi
 */
export type {
  DefinitionLocation,
  ExportedSymbol,
  ReferenceLocation,
  SearchMatch,
  SemanticMatch,
} from '@openthrottle/openthrottle-ide';

/**
 * Identity of the workspace/repository a view-model was produced for. Carried by
 * every envelope so the UI can label the active repo and stay project-aware.
 * @publicApi
 */
export interface IdeRepositoryRef {
  /** Human-readable repository name (e.g. the registered checkout's displayName). */
  displayName: string;
  /** Linked project id when the repository is associated with one. */
  projectId?: string;
  /** Stable id of the selected repository (drives the `?repositoryId=` param). */
  repositoryId: string;
}

/**
 * Workspace file listing produced by the loader's cheap (ripgrep) tier. `paths` is
 * the full workspace-relative set; the client filters/caps it (cmdk palette).
 * @publicApi
 */
export interface IdeWorkspaceListing {
  /** Every tracked file, as workspace-relative POSIX paths. */
  paths: string[];
  /** The repository these paths belong to. */
  repository: IdeRepositoryRef;
  /** True when the engine capped the path set (reserved; listFiles is uncapped today). */
  truncated: boolean;
}

/**
 * Text-search result envelope (ripgrep tier). Echoes the query back and flags when
 * matches were capped at the engine's `maxResults`.
 * @publicApi
 */
export interface IdeSearchResult {
  /** The matched lines (engine leaf type, passed through). */
  matches: SearchMatch[];
  /** The query that produced these matches, echoed for the client. */
  query: string;
  /** The repository searched. */
  repository: IdeRepositoryRef;
  /** True when matches were capped (maxResults reached). */
  truncated: boolean;
}

/**
 * Exported-symbols envelope (lazy ts-morph tier). Returned by the symbols resource
 * route when the Symbols tab is opened.
 * @publicApi
 */
export interface IdeExportsResult {
  /** The repository whose exports were enumerated. */
  repository: IdeRepositoryRef;
  /** Exported symbols (engine leaf type, passed through). */
  symbols: ExportedSymbol[];
  /** True when the symbol set was capped. */
  truncated: boolean;
}

/**
 * Definition + references resolved for a single selected symbol (click-driven
 * fetcher). `symbol` echoes the resolved target for labeling.
 * @publicApi
 */
export interface IdeSymbolDetails {
  /** Resolved declaration site(s). */
  definitions: DefinitionLocation[];
  /** Every reference across the workspace. */
  references: ReferenceLocation[];
  /** The repository the symbol belongs to. */
  repository: IdeRepositoryRef;
  /** The resolved symbol, for display (name + origin). */
  symbol: IdeSymbolRef;
}

/**
 * A minimal reference to a resolved symbol, for labeling the def/references panel.
 * @publicApi
 */
export interface IdeSymbolRef {
  /** 1-based line of the symbol's declaration. */
  line: number;
  /** The symbol's name. */
  name: string;
  /** Workspace-relative POSIX path of the declaration's file. */
  path: string;
}

/**
 * Semantic-search result envelope (gated tier). When `available` is false the index
 * or embeddings provider is absent and the UI renders the gated Empty state; real
 * data arrives from the server-side wiring (follow-up plan).
 * @publicApi
 */
export interface IdeSemanticResult {
  /** False when the semantic index/provider is unavailable (render the gated state). */
  available: boolean;
  /** Semantic matches (engine leaf type, passed through). */
  matches: SemanticMatch[];
  /** The query that produced these matches, echoed for the client. */
  query: string;
  /** The repository searched. */
  repository: IdeRepositoryRef;
}
