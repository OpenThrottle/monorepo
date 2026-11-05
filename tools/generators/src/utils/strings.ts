/**
 * Splits a comma-separated string into normalized values.
 * Trims each item and drops empty entries, so `a,b`, `a, b` and `a,,b` all
 * yield the non-empty tokens.
 */
export const parseCommaSeparatedValues = (value: string): string[] => {
  return value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
};

/**
 * CONSTANT_CASE for template identifiers: `probe-area` → `PROBE_AREA`,
 * `TestBadge` → `TEST_BADGE`, `v2-api` → `V2_API`. A plain `toUpperCase()`
 * keeps the hyphen (`PROBE-AREA`), which is not a valid identifier. Unlike
 * lodash `snakeCase`, digits stay attached to their word (`v2`, not `v_2`).
 */
export const toConstantCase = (value: string): string => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
};
