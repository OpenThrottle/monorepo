import type { AgentTrajectorySummaryFragment } from '~/__generated__/graphql';
import { TRAJECTORY_SUMMARY_COPY } from '~/routing/evals/data/data.copy';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

const COST_FORMAT = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 4,
  minimumFractionDigits: 2,
  style: 'currency',
});

/**
 * @description A token or count with thousands separators; the unknown dash
 * when the run did not report it.
 */
export const formatTrajectoryCount = (
  value: number | null | undefined,
): string => {
  if (value === null || value === undefined) {
    return TRAJECTORY_SUMMARY_COPY.unknown;
  }

  return NUMBER_FORMAT.format(value);
};

/**
 * @description A run's cost in USD. `null` means unpriceable, which is not
 * zero, so it reads as "unpriced" and never as `$0.00`.
 */
export const formatTrajectoryCost = (
  costUsd: number | null | undefined,
): string => {
  if (costUsd === null || costUsd === undefined) {
    return TRAJECTORY_SUMMARY_COPY.unpriced;
  }

  return COST_FORMAT.format(costUsd);
};

/**
 * @description A wall-clock duration: `850ms`, `42s`, `3m 07s`, `1h 02m`; the
 * unknown dash when it was not recorded.
 */
export const formatTrajectoryDuration = (
  durationMs: number | null | undefined,
): string => {
  if (durationMs === null || durationMs === undefined || durationMs < 0) {
    return TRAJECTORY_SUMMARY_COPY.unknown;
  }

  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`;
  }

  const totalSeconds = Math.round(durationMs / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${seconds}s`;
};

/**
 * @description Prompt and completion tokens on one line, prompt first and
 * including cached: `12,400 in (9,800 cached) / 1,250 out`.
 */
export const formatTrajectoryTokens = (
  tokens: Pick<
    AgentTrajectorySummaryFragment,
    'cachedTokens' | 'inputTokens' | 'outputTokens'
  >,
): string => {
  const { cached, input, output } = TRAJECTORY_SUMMARY_COPY;
  const prompt = `${formatTrajectoryCount(tokens.inputTokens)} ${input}`;
  const completion = `${formatTrajectoryCount(tokens.outputTokens)} ${output}`;
  const hasCached = tokens.cachedTokens != null && tokens.cachedTokens > 0;

  if (!hasCached) {
    return `${prompt} / ${completion}`;
  }

  const cachedLabel = `(${formatTrajectoryCount(tokens.cachedTokens)} ${cached})`;

  return `${prompt} ${cachedLabel} / ${completion}`;
};

/**
 * @description How the trajectory was captured, as a reader-facing label.
 */
export const formatTrajectorySource = (source: string): string => {
  if (source === 'session_upload') {
    return TRAJECTORY_SUMMARY_COPY.sourceSessionUpload;
  }

  if (source === 'spawned') {
    return TRAJECTORY_SUMMARY_COPY.sourceSpawned;
  }

  return source;
};

/**
 * @description A tool call's arguments as indented JSON for the expanded view.
 */
export const formatTrajectoryArguments = (
  args: Readonly<Record<string, unknown>>,
): string => {
  return JSON.stringify(args, null, 2);
};

/**
 * @description A one-line preview of a tool call's arguments, cut to
 * `maxChars` with an ellipsis, for the collapsed view.
 */
export const formatTrajectoryArgumentsPreview = (
  args: Readonly<Record<string, unknown>>,
  maxChars: number,
): string => {
  const compact = JSON.stringify(args);

  if (compact.length <= maxChars) {
    return compact;
  }

  return `${compact.slice(0, maxChars)}…`;
};

/**
 * @description Cuts long text to `maxLines` lines and `maxChars` characters
 * for the collapsed view. `isClamped` is false when nothing was cut, so the
 * caller can skip the expand control entirely.
 */
export const clampTrajectoryText = (
  text: string,
  limits: { readonly maxChars: number; readonly maxLines: number },
): {
  readonly isClamped: boolean;
  readonly lineCount: number;
  readonly visible: string;
} => {
  const lines = text.split('\n');
  const byLines = lines.slice(0, limits.maxLines).join('\n');
  const visible = byLines.slice(0, limits.maxChars);
  const isClamped = visible.length < text.length;

  return { isClamped, lineCount: lines.length, visible };
};

/**
 * @description The run's heading: the document's agent name and version, or
 * the driver when the document could not be read. A version the capture could
 * not determine (`unknown`, blank) is left off rather than printed.
 */
export const formatTrajectoryAgent = (
  agent: { readonly name: string; readonly version: string } | undefined,
  driver: string,
): string => {
  if (agent === undefined) {
    return driver;
  }

  const version = agent.version.trim();
  const hasVersion = version !== '' && version !== 'unknown';

  return hasVersion ? `${agent.name} ${version}` : agent.name;
};
