/**
 * @description Shared usage-limit signal for Claude Code. A subscription run that exhausts its
 * 5-hour or weekly window surfaces in `stream-json` output two ways: a `rate_limit_event` whose
 * `rate_limit_info.status` is `rejected` (carries the reset time), and a terminal `result` with
 * `is_error: true` and `api_error_status: 429` (carries only human text, which varies by CLI
 * version and is never keyed on). See docs/openthrottle/claude-stream-json-schema.md.
 */

/**
 * @description A subscription usage limit that was hit. `rateLimitType` is the raw window name
 * (`five_hour`, `seven_day`, …) kept as a string because the CLI adds windows over time.
 * `resetsAt` is an ISO-8601 instant; `null` means "limited, reset unknown".
 * @public
 */
export interface UsageLimit {
  readonly rateLimitType: string | null;
  readonly resetsAt: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Convert unix epoch SECONDS to an ISO-8601 string, or null when not a usable number. */
const epochSecondsToIso = (value: unknown): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const date = new Date(value * 1000);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * @description Parse a Claude `rate_limit_event.rate_limit_info` payload. Returns a
 * {@link UsageLimit} only when `status === 'rejected'`; `allowed` / `allowed_warning` and anything
 * malformed return null. `resetsAt` arrives as unix epoch seconds and is returned as ISO-8601.
 * @public
 */
export const parseClaudeRateLimitInfo = (value: unknown): UsageLimit | null => {
  if (!isRecord(value) || value.status !== 'rejected') {
    return null;
  }

  return {
    rateLimitType:
      typeof value.rateLimitType === 'string' ? value.rateLimitType : null,
    resetsAt: epochSecondsToIso(value.resetsAt),
  };
};

/**
 * @description True when a Claude `stream-json` event is a terminal error `result` with
 * `api_error_status === 429` — the usage-limit terminal. Never inspects the human `result` text.
 * @public
 */
export const isClaudeUsageLimitResult = (event: unknown): boolean =>
  isRecord(event) &&
  event.type === 'result' &&
  event.is_error === true &&
  event.api_error_status === 429;
