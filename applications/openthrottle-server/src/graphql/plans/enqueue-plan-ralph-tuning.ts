/**
 * @description Maps and validates GraphQL `ralph` enqueue options into {@link RalphNestedRunTuningInput}
 * for BullMQ spawn payloads (nested `workflow-ralph` argv). Orchestrator jobs use
 * `RunPlanOrchestratorJobData` and are built elsewhere when the enqueue API supports them.
 */

import type {
  ChildJobInput,
  RalphNestedDebugCli,
  RalphNestedRunTuningInput,
} from '@tools/workflows';
import { parseRalphExecutionBackendId } from '@tools/workflows';
import type { RunPlanSpawnJobData } from '../../queues/plans/plans.types';
import type { RalphPlanRunTuningInput } from './plan.input';

/** @description Upper bound to avoid abuse; aligns with positive-int expectations in workflow-ralph. */
const MAX_ITERATIONS = 1_000_000;

/** @description One week in seconds — generous cap for per-iteration timeout. */
const MAX_ITERATION_TIMEOUT_SECONDS = 7 * 24 * 3600;

const MAX_TUNING_STRING_LEN = 8192;

/**
 * @description Trims and caps string tuning fields; returns undefined if empty after trim.
 */
const normalizeOptionalString = (
  value: string | null | undefined,
): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const t = value.trim();
  if (t === '') return undefined;
  if (t.length > MAX_TUNING_STRING_LEN) {
    throw new Error(
      `Ralph tuning string fields must be at most ${MAX_TUNING_STRING_LEN} characters`,
    );
  }
  return t;
};

type ChildJobRalphTuning = Pick<
  ChildJobInput,
  | 'backend'
  | 'iterationTimeoutSeconds'
  | 'iterations'
  | 'model'
  | 'project'
  | 'prompt'
  | 'promptFile'
  | 'ralphDebugCli'
>;

/**
 * @description Strips `null` from {@link RalphNestedRunTuningInput} so spreads satisfy {@link ChildJobInput}.
 */
export const ralphTuningForChildJob = (
  r: RalphNestedRunTuningInput | undefined,
): ChildJobRalphTuning => {
  if (!r) return {};
  return {
    ...(r.backend != null ? { backend: r.backend } : {}),
    ...(r.iterationTimeoutSeconds != null
      ? { iterationTimeoutSeconds: r.iterationTimeoutSeconds }
      : {}),
    ...(r.iterations != null ? { iterations: r.iterations } : {}),
    ...(r.model !== undefined ? { model: r.model } : {}),
    ...(r.project !== undefined ? { project: r.project } : {}),
    ...(r.prompt !== undefined ? { prompt: r.prompt } : {}),
    ...(r.promptFile !== undefined ? { promptFile: r.promptFile } : {}),
    ...(r.ralphDebugCli !== undefined
      ? { ralphDebugCli: r.ralphDebugCli }
      : {}),
  } satisfies ChildJobRalphTuning;
};

/**
 * @description Maps GraphQL {@link RalphPlanRunTuningInput} to worker job tuning, or `undefined` when nothing effective was provided.
 * @throws Error when values are out of range or backend is unknown.
 */
export const parseEnqueueRalphTuning = (
  input: RalphPlanRunTuningInput | null | undefined,
): RalphNestedRunTuningInput | undefined => {
  if (input == null) return undefined;

  const backendRaw = normalizeOptionalString(input.backend);

  let iterations: number | undefined;
  if (input.iterations !== undefined && input.iterations !== null) {
    const n = input.iterations;
    if (!Number.isInteger(n) || n < 1 || n > MAX_ITERATIONS) {
      throw new Error(
        `ralph.iterations must be an integer from 1 to ${MAX_ITERATIONS}`,
      );
    }
    iterations = n;
  }

  let iterationTimeoutSeconds: number | undefined;
  if (
    input.iterationTimeoutSeconds !== undefined &&
    input.iterationTimeoutSeconds !== null
  ) {
    const sec = input.iterationTimeoutSeconds;
    if (
      !Number.isInteger(sec) ||
      sec < 1 ||
      sec > MAX_ITERATION_TIMEOUT_SECONDS
    ) {
      throw new Error(
        `ralph.iterationTimeoutSeconds must be an integer from 1 to ${MAX_ITERATION_TIMEOUT_SECONDS} (seconds)`,
      );
    }
    iterationTimeoutSeconds = sec;
  }

  const model = normalizeOptionalString(input.model);
  const project = normalizeOptionalString(input.project);
  const prompt = normalizeOptionalString(input.prompt);
  const promptFile = normalizeOptionalString(input.promptFile);

  let ralphDebugCli: RalphNestedDebugCli | undefined;
  if (input.ralphDebugCli != null) {
    const d = input.ralphDebugCli;
    if (d === 'omit' || d === 'debug' || d === 'verbose') {
      ralphDebugCli = d;
    }
  }

  const tuning: RalphNestedRunTuningInput = {
    ...(backendRaw !== undefined
      ? { backend: parseRalphExecutionBackendId(backendRaw, 'cli') }
      : {}),
    ...(iterations !== undefined ? { iterations } : {}),
    ...(iterationTimeoutSeconds !== undefined
      ? { iterationTimeoutSeconds }
      : {}),
    ...(model !== undefined ? { model } : {}),
    ...(project !== undefined ? { project } : {}),
    ...(prompt !== undefined ? { prompt } : {}),
    ...(promptFile !== undefined ? { promptFile } : {}),
    ...(ralphDebugCli !== undefined ? { ralphDebugCli } : {}),
  };

  if (Object.keys(tuning).length === 0) {
    return undefined;
  }

  return tuning;
};

/**
 * @description Builds {@link RunPlanSpawnJobData} for the plans queue from enqueue input (spawn path).
 */
export const buildRunPlanJobData = (input: {
  readonly planId: string;
  readonly ralph: RalphPlanRunTuningInput | null | undefined;
}): RunPlanSpawnJobData => {
  const ralph = parseEnqueueRalphTuning(input.ralph);
  if (ralph === undefined) {
    return { planId: input.planId };
  }
  return { planId: input.planId, ralph };
};
