/**
 * @description Constants for the semantic-search resolvers (OT plan ca13e543).
 */

/**
 * @description How long a search waits for its query embed before answering lexically with
 * `embedder_busy` (OT plan ca13e543), well inside the developer app's 15s GraphQL timeout.
 */
export const DEFAULT_SEARCH_EMBED_BUDGET_MS = 3000;
