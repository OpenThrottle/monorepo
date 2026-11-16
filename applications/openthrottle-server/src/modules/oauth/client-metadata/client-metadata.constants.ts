/**
 * @description Limits for fetching OAuth Client ID Metadata Documents. Design:
 * docs/openthrottle/mcp-oauth-design.md § CIMD.
 */

/** @description Abort the fetch after this long. */
export const CLIENT_METADATA_TIMEOUT_MS = 5_000;

/** @description Refuse documents larger than this. */
export const CLIENT_METADATA_MAX_BYTES = 16 * 1024;

/** @description Re-fetch a cached document older than this. */
export const CLIENT_METADATA_FRESH_MS = 60 * 60 * 1000;

/** @description On a failed re-fetch, keep using a cached document younger than this. */
export const CLIENT_METADATA_STALE_IF_ERROR_MS = 24 * 60 * 60 * 1000;
