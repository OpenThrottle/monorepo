/**
 * Maps and validates GraphQL `ralph` enqueue options into {@link RalphNestedRunTuningInput}
 * for BullMQ spawn payloads (nested `workflow-ralph` argv). Orchestrator jobs use
 * `RunPlanOrchestratorJobData` and are built elsewhere when the enqueue API supports them.
 */

import { existsSync, statSync } from 'fs';
import { isAbsolute } from 'path';
import {
  jobRunHooksForJobPayload,
  resolveJobRunHooksForEnqueue,
} from './enqueue-plan-job-run-hooks';
import {
  getWorkspacePathMapping,
  parseWorkflowRunnerId,
  toContainerPath,
} from '@openthrottle/openthrottle-agentic-utils';
import type {
  ChildJobInput,
  RalphNestedRunTuningInput,
} from '@tools/workflows';
import type { PlanJobRunHooksStorage } from '@openthrottle/nestjs-repositories';
import type { RalphPlanRunTuningInput } from './plan.input';
import type {
  RunPlanOrchestratorJobData,
  RunPlanSpawnJobData,
} from '../../queues/plans/plans.types';
import type {
  WorkflowConfigDebug,
  WorkflowConfigRunner,
} from '@openthrottle/openthrottle-agentic-workflow';

/**
 * RFC 4122 UUID — aligned with `tools/workflows` plan/task validation and developer `isOpenThrottleUuid`.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Default run kind for queued plan runs. `orchestrator` (in-process GraphQL orchestrator,
 * dispatched through the AgenticWorkflowBase registry) is the default; `spawn` (nested `workflow-ralph`)
 * is the explicit legacy opt-in. Stage (a) rollback: set `OPENTHROTTLE_DEFAULT_RUN_KIND=spawn` to revert
 * the default to spawn without code changes; the spawn path code remains intact.
 */
export type PlanRunKind = 'orchestrator' | 'spawn';

/**
 * The orchestrator-by-default value when the env override is unset/invalid.
 */
export const DEFAULT_PLAN_RUN_KIND: PlanRunKind = 'orchestrator';

/**
 * Resolves the default {@link PlanRunKind} for queued runs from
 * `OPENTHROTTLE_DEFAULT_RUN_KIND`. Returns {@link DEFAULT_PLAN_RUN_KIND} (`orchestrator`) unless the env
 * is explicitly `spawn` (case-insensitive). Any other value falls back to the orchestrator default.
 */
export const resolveDefaultPlanRunKind = (): PlanRunKind => {
  const raw = process.env.OPENTHROTTLE_DEFAULT_RUN_KIND?.trim().toLowerCase();
  if (raw === 'spawn') return 'spawn';
  return DEFAULT_PLAN_RUN_KIND;
};

/**
 * Returns true when `value` is a plausible OpenThrottle plan/task UUID.
 */
const isOpenThrottlePlanTaskUuid = (value: string): boolean =>
  UUID_REGEX.test(value.trim());

/**
 * Upper bound to avoid abuse; aligns with positive-int expectations in workflow-ralph.
 */
const MAX_ITERATIONS = 1_000_000;

/**
 * One week in seconds — generous cap for per-iteration timeout.
 */
const MAX_ITERATION_TIMEOUT_SECONDS = 7 * 24 * 3600;

const MAX_TUNING_STRING_LEN = 8192;

/**
 * Max path length for workingDirectory (prevents abuse).
 */
const MAX_WORKING_DIRECTORY_LEN = 4096;

/**
 * Optional allowlist of directory prefixes from `OPENTHROTTLE_ALLOWED_WORKING_DIRS`.
 * Comma-separated absolute paths; when set, workingDirectory must start with one of them.
 * When unset (default), any existing directory is accepted (local-only trust boundary).
 */
const getAllowedWorkingDirPrefixes = (): readonly string[] => {
  const raw = process.env.OPENTHROTTLE_ALLOWED_WORKING_DIRS;
  if (!raw || raw.trim() === '') {
    // Containerized with the workspace bridge mounted: contain to the mount by
    // default rather than "anything that exists" (the container fs is not the
    // user's machine). Host runs keep the permissive default.
    const mapping = getWorkspacePathMapping();
    return mapping === undefined ? [] : [mapping.containerDir];
  }
  // Entries may be written in the host view; compare in this process's view.
  return raw
    .split(',')
    .map((p) => toContainerPath(p.trim()))
    .filter((p) => p.length > 0 && isAbsolute(p));
};

/**
 * Validates and normalizes an optional workingDirectory from GraphQL input.
 * Returns the trimmed path or `undefined` when omitted. Throws on invalid input.
 */
export const validateWorkingDirectory = (
  raw: string | null | undefined,
): string | undefined => {
  if (raw === undefined || raw === null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;

  if (trimmed.length > MAX_WORKING_DIRECTORY_LEN) {
    throw new Error(
      `workingDirectory must be at most ${MAX_WORKING_DIRECTORY_LEN} characters`,
    );
  }

  if (!isAbsolute(trimmed)) {
    throw new Error('workingDirectory must be an absolute path');
  }

  // Validate against where the path lives in THIS process (host-truthful input,
  // container view when the Docker workspace bridge is active). The returned
  // value stays the caller's host-truthful form.
  const resolved = toContainerPath(trimmed);

  if (!existsSync(resolved)) {
    throw new Error(`workingDirectory does not exist: ${trimmed}`);
  }

  try {
    const stat = statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`workingDirectory is not a directory: ${trimmed}`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('workingDirectory')
    ) {
      throw error;
    }
    throw new Error(`workingDirectory is not accessible: ${trimmed}`);
  }

  const prefixes = getAllowedWorkingDirPrefixes();
  if (prefixes.length > 0) {
    const allowed = prefixes.some(
      (prefix) => resolved === prefix || resolved.startsWith(prefix + '/'),
    );
    if (!allowed) {
      throw new Error(
        `workingDirectory is not within allowed paths (OPENTHROTTLE_ALLOWED_WORKING_DIRS)`,
      );
    }
  }

  return trimmed;
};

/**
 * Trims and caps string tuning fields; returns undefined if empty after trim.
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

/**
 * Normalizes a raw Ralph debug shim level to a nested `debug` value, lowercasing
 * legacy uppercase inputs. Returns `undefined` for anything that is not a known
 * non-`omit` level (so unknown or `omit` values are dropped from job payloads).
 */
const normalizeNestedDebug = (
  value: string | null | undefined,
): Extract<WorkflowConfigDebug, 'debug' | 'verbose'> | undefined => {
  if (value == null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'debug') return 'debug';
  if (normalized === 'verbose') return 'verbose';
  return undefined;
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
  | 'skipWorktreeSetup'
  | 'worktree'
  | 'worktreeBase'
>;

/**
 * Strips `null` from {@link RalphNestedRunTuningInput} so spreads satisfy {@link ChildJobInput}.
 */
export const ralphTuningForChildJob = (
  r: RalphNestedRunTuningInput | undefined,
): ChildJobRalphTuning => {
  if (!r) return {};
  const ralphDebugCli = normalizeNestedDebug(r.debug);

  return {
    ...(r.backend != null ? { backend: r.backend } : {}),
    ...(ralphDebugCli !== undefined ? { ralphDebugCli } : {}),
    ...(r.iterationTimeoutSeconds != null
      ? { iterationTimeoutSeconds: r.iterationTimeoutSeconds }
      : {}),
    ...(r.iterations != null ? { iterations: r.iterations } : {}),
    ...(r.model !== undefined ? { model: r.model } : {}),
    ...(r.project !== undefined ? { project: r.project } : {}),
    ...(r.prompt !== undefined ? { prompt: r.prompt } : {}),
    ...(r.promptFile !== undefined ? { promptFile: r.promptFile } : {}),
    ...(r.skipWorktreeSetup === true ? { skipWorktreeSetup: true } : {}),
    ...(normalizeOptionalString(r.worktree) !== undefined
      ? { worktree: normalizeOptionalString(r.worktree) }
      : {}),
    ...(normalizeOptionalString(r.worktreeBase) !== undefined
      ? { worktreeBase: normalizeOptionalString(r.worktreeBase) }
      : {}),
  } satisfies ChildJobRalphTuning;
};

/**
 * Maps GraphQL {@link RalphPlanRunTuningInput} to worker job tuning, or `undefined` when nothing effective was provided.
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
  const worktree = normalizeOptionalString(input.worktree);
  const worktreeBase = normalizeOptionalString(input.worktreeBase);

  const ralphDebugCli = normalizeNestedDebug(input.ralphDebugCli);

  const tuning: RalphNestedRunTuningInput = {
    ...(backendRaw !== undefined
      ? { backend: parseWorkflowRunnerId(backendRaw, 'cli') }
      : {}),
    ...(iterations !== undefined ? { iterations } : {}),
    ...(iterationTimeoutSeconds !== undefined
      ? { iterationTimeoutSeconds }
      : {}),
    ...(model !== undefined ? { model } : {}),
    ...(project !== undefined ? { project } : {}),
    ...(prompt !== undefined ? { prompt } : {}),
    ...(promptFile !== undefined ? { promptFile } : {}),
    ...(ralphDebugCli !== undefined ? { debug: ralphDebugCli } : {}),
    ...(worktree !== undefined ? { worktree } : {}),
    ...(worktreeBase !== undefined ? { worktreeBase } : {}),
    ...(input.skipWorktreeSetup === true ? { skipWorktreeSetup: true } : {}),
  };

  if (Object.keys(tuning).length === 0) {
    return undefined;
  }

  return tuning;
};

/**
 * Resolves the execution backend persisted for the plan run. GraphQL omission falls back to the workflow-ralph default.
 */
const resolvePlanRunExecutionBackend = (
  ralph: RalphNestedRunTuningInput | undefined,
): WorkflowConfigRunner => ralph?.backend ?? 'cursor';

/**
 * Builds {@link RunPlanSpawnJobData} for the plans queue from enqueue input (spawn path).
 */
export const buildRunPlanJobData = (input: {
  readonly jobRunHooksJson?: string | null;
  readonly planId: string;
  readonly planJobRunHooks?: PlanJobRunHooksStorage | null;
  readonly ralph: RalphPlanRunTuningInput | null | undefined;
  readonly workingDirectory?: string | null;
}): RunPlanSpawnJobData => {
  const ralph = parseEnqueueRalphTuning(input.ralph);
  const executionBackend = resolvePlanRunExecutionBackend(ralph);
  const workingDirectory = validateWorkingDirectory(input.workingDirectory);
  const jobRunHooks = jobRunHooksForJobPayload(
    resolveJobRunHooksForEnqueue({
      enqueueHooksJson: input.jobRunHooksJson,
      planHooks: input.planJobRunHooks,
      workingDirectory: input.workingDirectory,
    }),
  );

  return {
    executionBackend,
    planId: input.planId,
    ...(jobRunHooks !== undefined ? { jobRunHooks } : {}),
    ...(ralph !== undefined ? { ralph } : {}),
    ...(workingDirectory !== undefined ? { workingDirectory } : {}),
  };
};

/**
 * Builds {@link RunPlanOrchestratorJobData} for in-process Ralph (plans queue, `run-plan-orchestrator`).
 * @throws Error when ids are invalid or task mode constraints fail.
 */
export const buildRunPlanOrchestratorJobData = (input: {
  readonly jobRunHooksJson?: string | null;
  readonly mode?: 'plan' | 'task' | null;
  readonly planId: string;
  readonly planJobRunHooks?: PlanJobRunHooksStorage | null;
  readonly ralph?: RalphPlanRunTuningInput | null;
  readonly taskId?: string | null;
  readonly workingDirectory?: string | null;
}): RunPlanOrchestratorJobData => {
  const planId = input.planId.trim();
  if (!isOpenThrottlePlanTaskUuid(planId)) {
    throw new Error('planId must be a valid OpenThrottle UUID');
  }

  const mode = input.mode ?? null;
  const taskRaw =
    input.taskId !== undefined && input.taskId !== null
      ? input.taskId.trim()
      : '';
  const workingDirectory = validateWorkingDirectory(input.workingDirectory);
  const jobRunHooks = jobRunHooksForJobPayload(
    resolveJobRunHooksForEnqueue({
      enqueueHooksJson: input.jobRunHooksJson,
      planHooks: input.planJobRunHooks,
      workingDirectory: input.workingDirectory,
    }),
  );
  const jobRunHooksSpread = jobRunHooks !== undefined ? { jobRunHooks } : {};

  if (mode === 'task') {
    if (taskRaw === '') {
      throw new Error('taskId is required when mode is task');
    }
    if (!isOpenThrottlePlanTaskUuid(taskRaw)) {
      throw new Error('taskId must be a valid OpenThrottle UUID');
    }
    const ralph = parseEnqueueRalphTuning(input.ralph);
    const executionBackend = resolvePlanRunExecutionBackend(ralph);
    return {
      executionBackend,
      mode: 'task',
      planId,
      ...jobRunHooksSpread,
      ...(ralph !== undefined ? { ralph } : {}),
      runKind: 'orchestrator',
      taskId: taskRaw,
      ...(workingDirectory !== undefined ? { workingDirectory } : {}),
    };
  }

  if (taskRaw !== '') {
    throw new Error('taskId is only allowed when mode is task');
  }

  const ralph = parseEnqueueRalphTuning(input.ralph);
  const executionBackend = resolvePlanRunExecutionBackend(ralph);
  const data: RunPlanOrchestratorJobData = {
    executionBackend,
    planId,
    runKind: 'orchestrator',
    ...jobRunHooksSpread,
    ...(mode === 'plan' ? { mode: 'plan' } : {}),
    ...(ralph !== undefined ? { ralph } : {}),
    ...(workingDirectory !== undefined ? { workingDirectory } : {}),
  };
  return data;
};
