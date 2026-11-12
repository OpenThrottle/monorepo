/**
 * @description Groups OT Loop task output into attempts. A task's chunks carry a `kind` and the
 * 1-based attempt number as `iteration`; consecutive chunks sharing a (task, attempt) pair form
 * one attempt. Ralph chunks, historical rows and plan-scoped chunks have no kind and stay plain.
 */
import { OUTPUT_STREAM_COPY } from '~/routing/plans/data/data.copy';
import {
  ATTEMPT_CLOSING_SUMMARY_MAX_CHARS,
  ATTEMPT_MS_PER_SECOND,
  ATTEMPT_PARAGRAPH_BREAK_PATTERN,
  ATTEMPT_SECONDS_PER_MINUTE,
  ATTEMPT_VALIDATION_SUMMARY_PATTERN,
  ATTEMPT_WORKER_KINDS,
} from '~/routing/plans/data/data.output-stream-attempt';
import type { OutputStreamChunk } from '~/routing/plans/utils/output-stream-chunks';
import { toChunkTimeMs } from '~/routing/plans/utils/output-stream-chunks';

export interface OutputStreamAttemptGroup {
  readonly chunks: readonly OutputStreamChunk[];
  readonly iteration: number;
  readonly taskId: string;
}

export type OutputStreamEntry =
  | { readonly attempt: OutputStreamAttemptGroup; readonly type: 'attempt' }
  | { readonly chunk: OutputStreamChunk; readonly type: 'chunk' };

export interface OutputStreamAttemptPreviewLine {
  readonly id: string;
  readonly text: string;
}

export interface OutputStreamAttemptSummary {
  /** Last worker prose, trimmed (last paragraph when long); null when the worker said nothing. */
  readonly closingSummary: string | null;
  /** The attempt's `[ot-loop]` status lines, in order. */
  readonly loopChunks: readonly OutputStreamChunk[];
  /** What shows while the attempt is collapsed: loop lines and the closing summary, in time order. */
  readonly preview: readonly OutputStreamAttemptPreviewLine[];
  /** One `lint ✗` style label per validation command summary line. */
  readonly validationLabels: readonly string[];
  /** First to last worker/tool chunk time; null when the attempt had no worker output. */
  readonly workerDurationMs: number | null;
}

/**
 * @description Whether the chunk belongs to an OT Loop attempt: task-scoped with a kind and an attempt number.
 */
function getAttemptKey(
  chunk: OutputStreamChunk,
): { iteration: number; taskId: string } | null {
  if (chunk.taskId == null || chunk.kind == null || chunk.iteration == null) {
    return null;
  }

  return { iteration: chunk.iteration, taskId: chunk.taskId };
}

/**
 * @description Walks chunks in order, folding consecutive OT Loop chunks of one (task, attempt)
 * into an attempt entry and leaving every other chunk as a plain entry.
 */
export function groupChunksIntoEntries(
  chunks: readonly OutputStreamChunk[],
): OutputStreamEntry[] {
  const entries: OutputStreamEntry[] = [];
  let open: {
    chunks: OutputStreamChunk[];
    iteration: number;
    taskId: string;
  } | null = null;

  for (const chunk of chunks) {
    const key = getAttemptKey(chunk);

    if (key === null) {
      open = null;
      entries.push({ chunk, type: 'chunk' });
    } else if (
      open !== null &&
      open.taskId === key.taskId &&
      open.iteration === key.iteration
    ) {
      open.chunks.push(chunk);
    } else {
      open = { chunks: [chunk], iteration: key.iteration, taskId: key.taskId };
      entries.push({ attempt: open, type: 'attempt' });
    }
  }

  return entries;
}

/**
 * @description `46s`, or `1m 17s` from a minute up; rounds to whole seconds.
 */
export function formatAttemptDuration(durationMs: number): string {
  const totalSeconds = Math.max(
    0,
    Math.round(durationMs / ATTEMPT_MS_PER_SECOND),
  );
  const minutes = Math.floor(totalSeconds / ATTEMPT_SECONDS_PER_MINUTE);
  const seconds = totalSeconds % ATTEMPT_SECONDS_PER_MINUTE;

  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
}

function toClosingSummary(text: string): string | null {
  const trimmed = text.trim();

  if (trimmed === '') {
    return null;
  }

  if (trimmed.length <= ATTEMPT_CLOSING_SUMMARY_MAX_CHARS) {
    return trimmed;
  }

  return (
    trimmed.split(ATTEMPT_PARAGRAPH_BREAK_PATTERN).at(-1)?.trim() ?? trimmed
  );
}

function toValidationLabels(chunks: readonly OutputStreamChunk[]): string[] {
  return chunks
    .filter((chunk) => chunk.kind === 'validation')
    .flatMap((chunk) => chunk.content.split('\n'))
    .flatMap((line) => {
      const match = ATTEMPT_VALIDATION_SUMMARY_PATTERN.exec(line.trim());

      return match === null ? [] : [`${match[1]} ${match[2]}`];
    });
}

function toWorkerDurationMs(
  chunks: readonly OutputStreamChunk[],
): number | null {
  const times = chunks
    .filter((chunk) => ATTEMPT_WORKER_KINDS.includes(chunk.kind ?? ''))
    .map((chunk) => toChunkTimeMs(chunk.createdAt))
    .filter((time) => time !== null);

  if (times.length === 0) {
    return null;
  }

  return Math.max(...times) - Math.min(...times);
}

/**
 * @description Derives what the attempt header and the always-visible body show.
 */
export function summarizeAttempt(
  attempt: OutputStreamAttemptGroup,
): OutputStreamAttemptSummary {
  const lastWorker = attempt.chunks.findLast(
    (chunk) => chunk.kind === 'worker',
  );
  const closingSummary =
    lastWorker === undefined ? null : toClosingSummary(lastWorker.content);
  const preview = attempt.chunks.flatMap((chunk) => {
    if (chunk.kind === 'loop') {
      return [{ id: chunk.id, text: chunk.content }];
    }

    if (chunk === lastWorker && closingSummary !== null) {
      return [{ id: chunk.id, text: closingSummary }];
    }

    return [];
  });

  return {
    closingSummary,
    loopChunks: attempt.chunks.filter((chunk) => chunk.kind === 'loop'),
    preview,
    validationLabels: toValidationLabels(attempt.chunks),
    workerDurationMs: toWorkerDurationMs(attempt.chunks),
  };
}

/**
 * @description Header text, e.g. `Attempt 1 · worker 1m 17s · validation: lint ✗`; the worker and
 * validation parts are omitted when the attempt had none.
 */
export function buildAttemptHeader(
  attempt: OutputStreamAttemptGroup,
  summary: OutputStreamAttemptSummary,
): string {
  const parts = [OUTPUT_STREAM_COPY.attemptLabel(attempt.iteration)];

  if (summary.workerDurationMs !== null) {
    parts.push(
      OUTPUT_STREAM_COPY.attemptWorker(
        formatAttemptDuration(summary.workerDurationMs),
      ),
    );
  }

  if (summary.validationLabels.length > 0) {
    parts.push(OUTPUT_STREAM_COPY.attemptValidation(summary.validationLabels));
  }

  return parts.join(OUTPUT_STREAM_COPY.attemptHeaderSeparator);
}
