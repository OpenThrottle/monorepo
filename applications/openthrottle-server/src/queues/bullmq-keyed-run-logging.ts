import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { ChildJobStreamChunk } from '@tools/workflows';

/**
 * @description Maps `runChildJob` stream chunks to JSONL lines (`type`: `stdout` | `stderr`).
 */
export const appendChildJobChunkToRunOutput = (
  writer: KeyedJsonlWriter | undefined,
  queueName: string,
  jobId: string,
  chunk: ChildJobStreamChunk,
): void => {
  writer?.appendRunChunk(queueName, jobId, {
    data: chunk.data,
    type: chunk.stream,
  });
};

/**
 * @description Handlers for legacy `spawnAndWait` Ralph runs: mirror lines to the keyed writer and LoggerService.
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
    params.writer?.appendRunChunk(params.queueName, params.jobId, {
      data: chunk,
      type: 'stderr',
    });
    params.logger.warn(chunk.trimEnd(), params.logContext);
  },
  onStdout: (chunk: string): void => {
    params.writer?.appendRunChunk(params.queueName, params.jobId, {
      data: chunk,
      type: 'stdout',
    });
    params.logger.info(chunk.trimEnd(), params.logContext);
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
