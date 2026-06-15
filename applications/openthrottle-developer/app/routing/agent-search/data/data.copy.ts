/**
 * @description Hardcoded copy for the agent-assets search route. Imported via the route module.
 */

export const AGENT_SEARCH_COPY = {
  diskFallbackNotice:
    'Showing on-disk matches — the semantic index is empty or unavailable. Run the agent-assets ingest to enable ranked semantic search.',
  emptyHeading: 'No matching agent assets',
  emptyMessage:
    'No skills, rules, or personas matched your query. Try different terms or a broader tab.',
  introBody:
    'Semantic search across your repo skills, rules, and personas (read-only; disk is the source of truth).',
  introHeading: 'Agent assets search',
  searchPlaceholder: 'Search skills, rules, and personas…',
} as const;
