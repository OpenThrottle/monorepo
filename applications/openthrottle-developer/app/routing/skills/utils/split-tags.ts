/** Splits a comma-separated tag field into trimmed, non-empty tags. */
export const splitTags = (raw: string): readonly string[] =>
  raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
