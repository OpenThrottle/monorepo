/**
 * Cap on skills returned for a filtered `/`-command query so the popover payload
 * stays bounded. Only applies when `q` is set; an unfiltered listing returns in
 * full for the client to cache and fuzzy-filter (mirrors the `@`-mention route).
 */
export const MAX_SLASH_COMMAND_RESULTS = 50;
