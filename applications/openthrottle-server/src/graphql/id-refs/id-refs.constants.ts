/**
 * @description Limits for id-ref resolution, shared by the resolver's schema
 * description, the service's queries and the input normalizer.
 */

/** Minimum normalized hex length before a lookup runs (matches resolvePlanRef). */
export const MIN_ID_REF_LENGTH = 6;

/** Hex length of a complete UUID once its hyphens are stripped. */
export const FULL_UUID_HEX_LENGTH = 32;

/** Hard cap on refs returned across plans and tasks combined. */
export const MAX_ID_REF_MATCHES = 8;
