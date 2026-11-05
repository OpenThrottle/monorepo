/**
 * @description Split a comma-separated form value into trimmed, non-empty
 * labels. Anything that is not a string yields no labels.
 */
export const splitCommaLabels = (value: unknown): string[] => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
};
