/**
 * Pretty-print a JSON payload string for display: re-indented when it parses,
 * the raw string when it doesn't, and null when empty/whitespace.
 *
 * @public
 */
export const formatJsonPayload = (raw: string | null): string | null => {
  if (raw === null || raw.trim() === '') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return JSON.stringify(parsed, undefined, 2);
  } catch {
    return raw;
  }
};

/**
 * @description Formats an ISO timestamp for display in the thread, or undefined when invalid.
 */
export const formatChatTimestamp = (iso: string): string | undefined => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};
