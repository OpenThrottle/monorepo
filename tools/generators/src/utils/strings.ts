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
