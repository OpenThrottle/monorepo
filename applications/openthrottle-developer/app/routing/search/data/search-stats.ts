/** Corpus cards in display order: the entities the server reports embedding coverage for. */
export const SEARCH_CORPUS_ENTITIES = [
  'plan',
  'task',
  'documentation',
  'code',
] as const;

/** Stat grid columns per stats view, sized to its card count. */
export const SEARCH_STATS_GRID_CLASS = {
  code: 'md:grid-cols-3',
  corpus: 'md:grid-cols-2 lg:grid-cols-4',
  knowledge: 'md:grid-cols-3 xl:grid-cols-5',
} as const;
