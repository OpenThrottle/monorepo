import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { ChildJobStreamChunk } from '@tools/workflows';

/**
 * @description Originating layer for a run-output chunk, used to make a single
 * mixed stdout/stderr stream attributable (finding #6). `workflow-ralph` is the
 * nested CLI orchestrator, `cursor-agent` is the agent dump it echoes, and `spawn`
 * is the process/package-manager wrapper that launches it.
 */
export const RUN_OUTPUT_SOURCE = {
  cursorAgent: 'cursor-agent',
  spawn: 'spawn',
  workflowRalph: 'workflow-ralph',
} as const;

/** @description One of the {@link RUN_OUTPUT_SOURCE} layer tags. */
export type RunOutputSource =
  (typeof RUN_OUTPUT_SOURCE)[keyof typeof RUN_OUTPUT_SOURCE];

/**
 * @description Process/package-manager failures emitted by the spawn wrapper (not by
 * workflow-ralph or the agent). Matching any of these attributes the chunk to {@link RUN_OUTPUT_SOURCE.spawn}.
 */
const SPAWN_MARKERS: readonly string[] = [
  '/bin/sh:',
  'ELIFECYCLE',
  'ERR_PNPM',
  'command not found',
  'npm ERR!',
];

/**
 * @description Stable workflow-ralph CLI / debug markers. The CLI prints orchestration
 * lines with these prefixes/emoji (see tools/workflows ralph.ts, run-iteration.ts,
 * ralph-debug-logger.ts). Everything not matched here (and not a spawn marker) is treated
 * as the agent dump ({@link RUN_OUTPUT_SOURCE.cursorAgent}), which is the bulk default.
 */
const WORKFLOW_RALPH_MARKERS: readonly string[] = [
  '[workflow-ralph',
  '🐛',
  '💬',
  '💰 💰',
  '📋',
  '📌',
  '📖',
  '📝',
  '📺',
  '🔁',
  '🖥',
  '🤖',
  '🧠',
  '🧩',
  '🎉',
  '✅',
];

const includesAny = (text: string, markers: readonly string[]): boolean => {
  return markers.some((marker) => text.includes(marker));
};

/**
 * @description Best-effort attribution of a run-output chunk to its originating layer.
 * Precedence: spawn (process/pm failures) → workflow-ralph (known CLI/debug markers) →
 * cursor-agent (default; the echoed agent result dump).
 */
export const classifyRunOutputSource = (chunk: {
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
}): RunOutputSource => {
  if (includesAny(chunk.data, SPAWN_MARKERS)) {
    return RUN_OUTPUT_SOURCE.spawn;
  }

  if (includesAny(chunk.data, WORKFLOW_RALPH_MARKERS)) {
    return RUN_OUTPUT_SOURCE.workflowRalph;
  }

  return RUN_OUTPUT_SOURCE.cursorAgent;
};

/**
 * @description Appends the originating layer to a LoggerService context so emitted lines
 * are attributable (e.g. `PlansProcessor [cursor-agent]`).
 */
export const runOutputLogContext = (
  logContext: string,
  source: RunOutputSource,
): string => {
  return `${logContext} [${source}]`;
};

/**
 * @description Maps `runChildJob` stream chunks to JSONL lines (`type`: `stdout` | `stderr`),
 * tagged with the originating layer (`source`). When `logger`/`logContext` are provided, also
 * mirrors each chunk to the LoggerService (info for stdout, warn for stderr) tagged by source,
 * giving the worktree path per-chunk LoggerService parity with the legacy spawn path (finding #6).
 */
export const appendChildJobChunkToRunOutput = (
  writer: KeyedJsonlWriter | undefined,
  queueName: string,
  jobId: string,
  chunk: ChildJobStreamChunk,
  observability?: {
    readonly logContext: string;
    readonly logger: LoggerService;
  },
): void => {
  const source = classifyRunOutputSource(chunk);

  writer?.appendRunChunk(queueName, jobId, {
    data: chunk.data,
    source,
    type: chunk.stream,
  });

  if (observability === undefined) {
    return;
  }

  const context = runOutputLogContext(observability.logContext, source);
  const line = chunk.data.trimEnd();

  if (chunk.stream === 'stderr') {
    observability.logger.warn(line, context);
  } else {
    observability.logger.info(line, context);
  }
};

/**
 * @description Handlers for legacy `spawnAndWait` Ralph runs: mirror lines to the keyed writer and
 * LoggerService, each tagged with the originating layer (`source`) for attribution (finding #6).
 */
export const createSpawnRunOutputHandlers = (params: {
  readonly jobId: string;
  readonly logContext: string;
  readonly logger: LoggerService;
  readonly queueName: string;
  readonly writer: KeyedJsonlWriter | undefined;
}): {
  readonly onStderr: (chunk: string) => void;
  readonly onStdout: (chunk: string) => void;
} => ({
  onStderr: (chunk: string): void => {
    const source = classifyRunOutputSource({ data: chunk, stream: 'stderr' });

    params.writer?.appendRunChunk(params.queueName, params.jobId, {
      data: chunk,
      source,
      type: 'stderr',
    });
    params.logger.warn(
      chunk.trimEnd(),
      runOutputLogContext(params.logContext, source),
    );
  },
  onStdout: (chunk: string): void => {
    const source = classifyRunOutputSource({ data: chunk, stream: 'stdout' });

    params.writer?.appendRunChunk(params.queueName, params.jobId, {
      data: chunk,
      source,
      type: 'stdout',
    });
    params.logger.info(
      chunk.trimEnd(),
      runOutputLogContext(params.logContext, source),
    );
  },
});

/**
 * @description Flush+close the job file after the processor finishes (success, failure, or cancel).
 */
export const closeRunOutputForJob = async (params: {
  readonly jobId: string;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly queueName: string;
  readonly writer: KeyedJsonlWriter | undefined;
}): Promise<void> => {
  if (params.writer === undefined) {
    return;
  }

  try {
    await params.writer.close(params.queueName, params.jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    params.logger.warn(
      `BullMQ run output: KeyedJsonlWriter.close failed for queue=${params.queueName} jobId=${params.jobId}: ${message}`,
      params.logLabel,
    );
  }
};
