import type { DocEntry } from './buildDocsManifest';

/**
 * The in-app link for a manifest entry. Docs pages link to their route path;
 * FAQ entries all live on `/faq` and deep-link to their accordion via `#slug`.
 *
 * @public
 */
export const docEntryHref = (entry: DocEntry): string => {
  if (entry.section === 'faq') {
    return entry.slug.length > 0 ? `/faq#${entry.slug}` : '/faq';
  }
  return entry.path;
};

/**
 * Searchable fields in best-match-first order. A hit in an earlier field ranks
 * an entry above a hit found only in a later field.
 */
const SEARCH_FIELDS = ['title', 'description', 'group', 'content'] as const;

const fieldHaystacks = (entry: DocEntry): readonly string[] => [
  entry.title.toLowerCase(),
  (entry.description ?? '').toLowerCase(),
  entry.group.toLowerCase(),
  entry.content.toLowerCase(),
];

/**
 * Filter and rank manifest entries against a free-text query, fully in-memory
 * (no network). Matching is case-insensitive and token-based: every
 * whitespace-delimited token in the query must appear somewhere across an
 * entry's title, description, group, or body. Entries are ranked by the
 * best (earliest) field in which *all* tokens co-occur — a title match
 * outranks a body-only match — and ties preserve the manifest's own order
 * (section, group, order, title). An empty query returns the manifest head
 * (so the palette can list everything before the user types).
 *
 * @public
 */
export const searchDocEntries = (
  entries: readonly DocEntry[],
  query: string,
  limit = 20,
): readonly DocEntry[] => {
  const normalized = query.trim().toLowerCase();

  if (normalized.length === 0) {
    return entries.slice(0, limit);
  }

  const tokens = normalized.split(/\s+/u);

  const ranked = entries
    .map((entry, index) => {
      const haystacks = fieldHaystacks(entry);

      let rank: number = SEARCH_FIELDS.length;
      for (let field = 0; field < SEARCH_FIELDS.length; field += 1) {
        if (tokens.every((token) => haystacks[field].includes(token))) {
          rank = field;
          break;
        }
      }

      return { entry, index, rank };
    })
    .filter((candidate) => candidate.rank < SEARCH_FIELDS.length)
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  return ranked.slice(0, limit).map((candidate) => candidate.entry);
};
