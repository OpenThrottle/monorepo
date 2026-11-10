/** @description Mark in a summary line for a command that exited 0. */
export const SUMMARY_GREEN_MARK = '✔';

/** @description Mark in a summary line for a command that failed or timed out. */
export const SUMMARY_RED_MARK = '✗';

/** @description Separator between the label/outcome and the duration in a summary line. */
export const SUMMARY_SEPARATOR = '·';

/** @description Outcome words in a red summary line: `exit <code>` or `timed out`. */
export const SUMMARY_EXIT_WORD = 'exit';

/** @description Outcome words in a red summary line for the timeout case. */
export const SUMMARY_TIMED_OUT_WORD = 'timed out';

/** @description Longest label taken from a command that is not an Nx target run. */
export const SUMMARY_LABEL_MAX_CHARS = 60;

/** @description Marker closing a label truncated to `SUMMARY_LABEL_MAX_CHARS`. */
export const SUMMARY_LABEL_ELLIPSIS = '…';

/** @description Matches an `nx affected` / `nx run-many` invocation. */
export const NX_TARGET_RUN_PATTERN = /\bnx\s+(?:affected|run-many)\b/;

/** @description Captures the target list after `-t`, `--target` or `--targets`: `a,b`, or space-separated `a b` up to the next flag. */
export const NX_TARGET_FLAG_PATTERN =
  /(?:^|\s)(?:-t|--targets?)(?:=|\s+)([^\s-]\S*(?:\s+[^\s-]\S*)*)/;
