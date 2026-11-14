/**
 * @description Pure helpers for id-ref resolution: normalizing user input into a
 * hex prefix and expanding a complete 32-hex id back into its hyphenated UUID.
 */

import {
  FULL_UUID_HEX_LENGTH,
  MIN_ID_REF_LENGTH,
} from './id-refs.constants.ts';

const REGEX_HEX_ONLY = /^[0-9a-f]+$/;

/**
 * @description Normalize a user-supplied id fragment or UUID: trim, lowercase,
 * strip hyphens. Returns null when the result is shorter than
 * {@link MIN_ID_REF_LENGTH}, longer than a UUID, or contains non-hex characters,
 * so junk input never reaches a query.
 */
export const normalizeIdRef = (ref: string): string | null => {
  const normalized = ref.trim().toLowerCase().replace(/-/g, '');

  if (normalized.length < MIN_ID_REF_LENGTH) {
    return null;
  }

  if (normalized.length > FULL_UUID_HEX_LENGTH) {
    return null;
  }

  if (!REGEX_HEX_ONLY.test(normalized)) {
    return null;
  }

  return normalized;
};

/**
 * @description Expand 32 normalized hex characters into the canonical
 * 8-4-4-4-12 hyphenated UUID, so a full id can use an exact (indexed) match.
 */
export const toHyphenatedUuid = (hex: string): string => {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};
