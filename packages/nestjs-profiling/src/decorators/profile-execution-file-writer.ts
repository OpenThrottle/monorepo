import * as fs from 'node:fs/promises';
import type { ProfileExecutionResult } from './profile-execution.types';

/**
 * @description Options for writing profile execution results to a file (e.g. for AI tuning and debugging).
 */
export interface ProfileExecutionFileWriterOptions {
  /**
   * Output file path. Directory must exist; file is created if missing and appended to.
   */
  readonly outputPath: string;
  /**
   * Format: 'ndjson' (one JSON object per line, append-friendly).
   * @default 'ndjson'
   */
  readonly format?: 'ndjson';
}

/**
 * @description Creates a reporter that appends each {@link ProfileExecutionResult} to a file (NDJSON).
 * Use with {@link setProfileExecutionReporter} so decorator and util output is written for AI consumption.
 * Writes are asynchronous and fire-and-forget from the reporter callback.
 */
export function createProfileExecutionFileWriter(
  options: ProfileExecutionFileWriterOptions,
): (result: ProfileExecutionResult) => void {
  const { outputPath } = options;

  return (result: ProfileExecutionResult): void => {
    void fs
      .appendFile(outputPath, JSON.stringify(result) + '\n', 'utf8')
      .catch(() => {
        // Fire-and-forget: no rethrow
      });
  };
}
