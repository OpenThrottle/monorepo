import {
  NX_TARGET_FLAG_PATTERN,
  NX_TARGET_RUN_PATTERN,
  SUMMARY_EXIT_WORD,
  SUMMARY_GREEN_MARK,
  SUMMARY_LABEL_ELLIPSIS,
  SUMMARY_LABEL_MAX_CHARS,
  SUMMARY_RED_MARK,
  SUMMARY_SEPARATOR,
  SUMMARY_TIMED_OUT_WORD,
} from '../data/data.validation-summary.ts';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/**
 * @description Short name for a validation command: the target list for `nx affected` /
 * `nx run-many`, otherwise the command collapsed to one line and truncated.
 * @public
 */
export const labelForCommand = (command: string): string => {
  if (NX_TARGET_RUN_PATTERN.test(command)) {
    const targets = NX_TARGET_FLAG_PATTERN.exec(command)?.[1];

    if (targets !== undefined) {
      return targets.split(/\s+/).join(',');
    }
  }

  const oneLine = command.replace(/\s+/g, ' ').trim();

  return oneLine.length <= SUMMARY_LABEL_MAX_CHARS
    ? oneLine
    : `${oneLine.slice(0, SUMMARY_LABEL_MAX_CHARS - 1)}${SUMMARY_LABEL_ELLIPSIS}`;
};

/**
 * @description `46s`, or `2m 5s` from a minute up; rounds to whole seconds.
 * @public
 */
export const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.max(0, Math.round(durationMs / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
};

/** @public */
export type CommandSummaryOutcome =
  | { readonly kind: 'green' }
  | { readonly exitCode: number; readonly kind: 'red' }
  | { readonly kind: 'timed_out' };

const describeRed = (
  outcome: Exclude<CommandSummaryOutcome, { readonly kind: 'green' }>,
): string => {
  if (outcome.kind === 'timed_out') {
    return SUMMARY_TIMED_OUT_WORD;
  }

  return `${SUMMARY_EXIT_WORD} ${outcome.exitCode}`;
};

/**
 * @description One summary line, no trailing newline: `lint ✔ · 46s`, `lint ✗ exit 1 · 54s`,
 * `lint ✗ timed out · 30m 0s`.
 * @public
 */
export const summarizeCommand = (input: {
  readonly command: string;
  readonly durationMs: number;
  readonly outcome: CommandSummaryOutcome;
}): string => {
  const label = labelForCommand(input.command);
  const duration = formatDuration(input.durationMs);

  if (input.outcome.kind === 'green') {
    return `${label} ${SUMMARY_GREEN_MARK} ${SUMMARY_SEPARATOR} ${duration}`;
  }

  const reason = describeRed(input.outcome);

  return `${label} ${SUMMARY_RED_MARK} ${reason} ${SUMMARY_SEPARATOR} ${duration}`;
};
