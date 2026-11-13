/**
 * @description The edges of trajectory capture. `buildTrajectoryRecord` is the client side: one
 * finished run's raw stdout in, a capped ATIF document plus its run facts out, ready to send.
 * `summarizeTrajectory` (with `parseAtifTrajectoryJson` in `parse-atif.ts`) is the server side: validate what arrived and
 * derive the summary columns from the document itself, so a client can never send a summary that
 * disagrees with its trajectory.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { AtifTrajectory } from '../../types/atif.ts';
import { readStructuredOutput } from '../structured-output/chunk-reader.ts';
import { capTrajectory } from './capTrajectory.ts';
import { chunksToAtif } from './chunksToAtif.ts';

/**
 * @description Total size a trajectory is capped to before it is sent. The server's JSON body limit
 * is 1 MB and the document travels as an escaped string inside that body, so 640 KiB leaves room
 * for the escaping. The server still applies the 4 MiB storage cap to whatever arrives.
 * @public
 */
export const TRAJECTORY_TRANSPORT_BYTES = 640 * 1024;

/**
 * @description Everything known about one finished run iteration.
 * @public
 */
export interface BuildTrajectoryRecordInput {
  readonly agentVersion: string;
  readonly driverId: string;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly model: string | undefined;
  readonly openthrottle: Readonly<Record<string, unknown>>;
  readonly outcome: string;
  readonly prompt: string;
  readonly rawStdout: string;
  readonly reportsToolCalls: boolean;
}

/**
 * @description A run's trajectory, capped for transport, with the run facts the document cannot
 * carry. `trajectoryJson` is what the `recordAgentTrajectory` mutation takes.
 * @public
 */
export interface TrajectoryRecord {
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly outcome: string;
  readonly trajectory: AtifTrajectory;
  readonly trajectoryJson: string;
  readonly truncated: boolean;
}

/**
 * @description Builds the record for one run iteration, or `undefined` when its stdout held no
 * structured events at all (a CLI that failed before starting prints prose, and an empty
 * trajectory would claim a run that told us nothing).
 * @public
 */
export const buildTrajectoryRecord = (
  input: BuildTrajectoryRecordInput,
): TrajectoryRecord | undefined => {
  const chunks = readStructuredOutput(input.driverId, input.rawStdout);

  if (chunks.length === 0) {
    return undefined;
  }

  const trajectory = chunksToAtif({
    agentName: input.driverId,
    agentVersion: input.agentVersion,
    chunks,
    driverId: input.driverId,
    modelName: input.model,
    openthrottle: input.openthrottle,
    prompt: input.prompt,
    reportsToolCalls: input.reportsToolCalls,
  });
  const capped = capTrajectory(trajectory, {
    observationBytes: 16 * 1024,
    totalBytes: TRAJECTORY_TRANSPORT_BYTES,
  });

  return {
    durationMs: input.durationMs,
    exitCode: input.exitCode,
    outcome: input.outcome,
    trajectory: capped.trajectory,
    trajectoryJson: JSON.stringify(capped.trajectory),
    truncated: capped.truncated,
  };
};

/**
 * @description The summary columns of a stored trajectory, derived from the document.
 * @public
 */
export interface TrajectorySummary {
  readonly cachedTokens: number | null;
  readonly costUsd: number | null;
  readonly incomplete: boolean;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly toolCallCount: number;
}

const finiteOrNull = (value: number | undefined): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/**
 * @description Derives the summary columns from a trajectory. Tokens and cost are `null` (not zero)
 * when the run reported none; `incomplete` reads `extra.openthrottle.incomplete`.
 * @public
 */
export const summarizeTrajectory = (
  trajectory: AtifTrajectory,
): TrajectorySummary => {
  const metrics = trajectory.final_metrics;
  const openthrottle = trajectory.extra?.openthrottle;
  const incomplete = isRecord(openthrottle) && openthrottle.incomplete === true;
  const toolCallCount = trajectory.steps.reduce((sum, step) => {
    return sum + (step.tool_calls?.length ?? 0);
  }, 0);

  return {
    cachedTokens: finiteOrNull(metrics?.total_cached_tokens),
    costUsd: finiteOrNull(metrics?.total_cost_usd),
    incomplete,
    inputTokens: finiteOrNull(metrics?.total_prompt_tokens),
    outputTokens: finiteOrNull(metrics?.total_completion_tokens),
    toolCallCount,
  };
};
