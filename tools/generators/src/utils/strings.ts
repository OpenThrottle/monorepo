/**
 * @description Splits a comma-separated string into normalized values.
 * Collapses repeated spaces, trims items, and supports `a,b` and `a, b`.
 */
export const parseCommaSeparatedValues = (value: string): string[] => {
  let normalized = value.trim();

  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.replace(', ', ',');

  return normalized.split(',').map((n) => n.trim());
};
