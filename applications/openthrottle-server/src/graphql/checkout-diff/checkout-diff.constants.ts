/** @description Largest patch returned for one file, in characters; longer patches are cut and flagged. */
export const MAX_PATCH_CHARS = 200_000;

/** @description Most files a diff lists; more are cut and flagged with `filesTruncated`. */
export const MAX_DIFF_FILES = 1_000;

/** @description Most untracked files read for line counts; the rest are listed with zero counts. */
export const MAX_UNTRACKED_FILES = 200;

/** @description Untracked files larger than this are listed as binary rather than read. */
export const MAX_UNTRACKED_BYTES = 512 * 1024;

/** @description Per-command timebox for a git probe, in milliseconds. */
export const GIT_COMMAND_TIMEOUT_MS = 10_000;

/** @description Cap on stdout for one git command (a whole-repo diff stays bounded). */
export const GIT_MAX_BUFFER_BYTES = 8 * 1024 * 1024;

/** @description Base refs tried, in order, when `origin/HEAD` does not resolve. */
export const FALLBACK_BASE_REFS: readonly string[] = [
  'origin/main',
  'origin/master',
  'main',
  'master',
];

/** @description Arguments every `git diff` probe starts with: no colour, no external differ, rename detection. */
export const DIFF_ARGS: readonly string[] = [
  'diff',
  '--no-color',
  '--no-ext-diff',
  '-M',
];
