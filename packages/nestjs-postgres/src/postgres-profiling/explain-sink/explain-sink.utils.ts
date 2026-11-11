import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  isExplainOutput,
  summarizeExplainPlan,
} from '../explain-plan/explain-plan.utils.ts';
import {
  POSTGRES_EXPLAIN_SEQ_SCAN_NOTE,
  POSTGRES_PROFILING_LOGGER,
  POSTGRES_PROFILING_LOGGER_CONTEXT,
  POSTGRES_PROFILING_MODES,
} from '../postgres-profiling.constants.ts';
import type {
  PostgresExplainPlanEntry,
  PostgresProfilingOutput,
} from '../postgres-profiling.types.ts';

// Module-level so two plans for the same class.method in one millisecond get distinct files.
let fileSequence = 0;

const toFilesystemSafeTimestamp = (date: Date): string => {
  return date.toISOString().replace(/[:.]/g, '-');
};

const formatPlanDetail = (entry: PostgresExplainPlanEntry): string => {
  return [
    `${entry.className}.${entry.methodName}`,
    entry.query,
    JSON.stringify(entry.plan, null, 2),
  ].join('\n');
};

const logPlan = (entry: PostgresExplainPlanEntry): void => {
  if (!isExplainOutput(entry.plan)) {
    POSTGRES_PROFILING_LOGGER.info(formatPlanDetail(entry), {
      context: POSTGRES_PROFILING_LOGGER_CONTEXT,
    });

    return;
  }

  const summary = summarizeExplainPlan(entry.plan, entry.durationMs);
  const summaryLine = `${entry.className}.${entry.methodName} → ${summary.line}`;

  if (summary.hasSeqScan) {
    POSTGRES_PROFILING_LOGGER.warn(
      `${summaryLine} (${POSTGRES_EXPLAIN_SEQ_SCAN_NOTE})`,
      { context: POSTGRES_PROFILING_LOGGER_CONTEXT },
    );
  } else {
    POSTGRES_PROFILING_LOGGER.info(summaryLine, {
      context: POSTGRES_PROFILING_LOGGER_CONTEXT,
    });
  }

  POSTGRES_PROFILING_LOGGER.debug(formatPlanDetail(entry), {
    context: POSTGRES_PROFILING_LOGGER_CONTEXT,
  });
};

const writePlanFile = async (
  outputDir: string,
  entry: PostgresExplainPlanEntry,
): Promise<void> => {
  fileSequence += 1;
  const fileName = `${entry.className}.${entry.methodName}.${toFilesystemSafeTimestamp(new Date())}-${fileSequence}.json`;

  const fileContent = isExplainOutput(entry.plan)
    ? { ...entry, summary: summarizeExplainPlan(entry.plan, entry.durationMs) }
    : entry;

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    join(outputDir, fileName),
    JSON.stringify(fileContent, null, 2),
    'utf8',
  );
};

/**
 * @description Emits one explain plan to the sink chosen by `POSTGRES_PROFILING_MODE`. Never rejects:
 * a failing sink is logged as a warning so the decorated method is unaffected.
 */
export const writePostgresExplainPlan = async (
  output: PostgresProfilingOutput,
  entry: PostgresExplainPlanEntry,
): Promise<void> => {
  try {
    if (output.mode === POSTGRES_PROFILING_MODES.FILE) {
      await writePlanFile(output.outputDir, entry);

      return;
    }

    logPlan(entry);
  } catch (error: unknown) {
    POSTGRES_PROFILING_LOGGER.warn(
      `Could not write explain plan for ${entry.className}.${entry.methodName}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { context: POSTGRES_PROFILING_LOGGER_CONTEXT },
    );
  }
};
