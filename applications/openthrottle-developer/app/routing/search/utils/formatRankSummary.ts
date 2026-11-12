import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';

/** One-line position label: global index, page, and within-page index. */
export const formatRankSummary = (meta: SearchRankMeta): string => {
  const globalIndex = (meta.page - 1) * meta.pageSize + meta.indexOnPage + 1;
  return `Result ${globalIndex} of ${meta.total} (page ${meta.page}, position ${meta.indexOnPage + 1} of ${meta.pageSize} on this page). Ordering is by embedding similarity, not keyword match.`;
};
