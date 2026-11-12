/** @description Longest closing summary shown whole; a longer one is cut to its last paragraph. */
export const ATTEMPT_CLOSING_SUMMARY_MAX_CHARS = 600;

/** @description Producer kinds that count towards the worker's working time. */
export const ATTEMPT_WORKER_KINDS: readonly string[] = ['tool', 'worker'];

/** @description Matches one validation command summary line: `lint ✔ · 46s`, `lint ✗ exit 1 · 54s`, `lint ✗ timed out · 30m 0s`. */
export const ATTEMPT_VALIDATION_SUMMARY_PATTERN =
  /^(\S.*?) ([✔✗])(?: (?:exit \d+|timed out))? · (?:\d+h )?(?:\d+m )?\d+s$/;

/** @description Blank-line boundary between paragraphs. */
export const ATTEMPT_PARAGRAPH_BREAK_PATTERN = /\n\s*\n/;

export const ATTEMPT_MS_PER_SECOND = 1000;
export const ATTEMPT_SECONDS_PER_MINUTE = 60;
