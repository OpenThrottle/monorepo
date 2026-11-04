/** Narrows an unknown value to a string, mapping everything else to null. */
export const nullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;
