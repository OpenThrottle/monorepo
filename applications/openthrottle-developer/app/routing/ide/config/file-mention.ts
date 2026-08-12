/**
 * Cap on paths returned for a filtered `@`-mention query so the popover payload
 * (and DOM) stays bounded on large repositories. Only applies when `q` is set;
 * an unfiltered listing returns in full for the client to cache and fuzzy-filter.
 */
export const MAX_FILE_MENTION_RESULTS = 50;
