/**
 * Decode the JSON-encoded `fileMentions` form field (workspace-relative paths
 * parsed from the composer draft) into a string array, or null when absent or
 * malformed. Defensive: the value is our own JSON.stringify output, but a bad
 * value must never 500 the turn.
 */
export const parseFileMentionsField = (
  value: FormDataEntryValue | null,
): string[] | null => {
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const paths = parsed.filter(
      (entry): entry is string => typeof entry === 'string',
    );
    return paths.length > 0 ? paths : null;
  } catch {
    return null;
  }
};
