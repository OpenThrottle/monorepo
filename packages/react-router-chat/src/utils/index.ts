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

/**
 * @description Formats an ISO timestamp as a compact relative label for the
 * conversations list: `just now`, `5m ago`, `3h ago`, `2d ago`, then a short
 * absolute date beyond a week. Returns an empty string for an invalid input.
 * `now` is injectable so the derivation is deterministic under test.
 * @public
 */
export const formatRelativeChatTimestamp = (
  iso: string,
  now: number = Date.now(),
): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const diffMs = Math.max(now - then, 0);

  if (diffMs < MINUTE) {
    return 'just now';
  }
  if (diffMs < HOUR) {
    return `${Math.floor(diffMs / MINUTE)}m ago`;
  }
  if (diffMs < DAY) {
    return `${Math.floor(diffMs / HOUR)}h ago`;
  }
  if (diffMs < WEEK) {
    return `${Math.floor(diffMs / DAY)}d ago`;
  }

  return new Date(then).toLocaleDateString();
};

export * from './chat-checkout-selection';
export * from './checkout-groups';
export * from './checkout-labels';
export * from './repository-identity';
