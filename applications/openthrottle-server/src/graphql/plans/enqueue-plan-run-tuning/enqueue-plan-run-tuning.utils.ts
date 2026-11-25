/**
 * Maps and validates the GraphQL `tuning` enqueue options into {@link PlanRunTuningSettings}
 * and builds the `RunPlanOrchestratorJobData` payload for the plans queue.
 */

import type { ConversationReasoningEffort } from '@openthrottle/agentic-conversation-backend';
import {
  CONVERSATION_REASONING_EFFORTS,
  toConversationReasoningEffort,
} from '@openthrottle/agentic-conversation-backend';
import type {
  JobRunHookEntry,
  PlanRunTuningSettings,
  WorkflowConfigDebug,
  WorkflowConfigRunner,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  getWorkspacePathMapping,
  parseWorkflowRunnerId,
  toContainerPath,
} from '@openthrottle/openthrottle-agentic-utils';
import type {
  PlanJobRunHooksStorage,
  PlanRunConfigOtLoop,
} from '@openthrottle/openthrottle-plan-config';
import { DEFAULT_PLAN_RUN_DRIVER } from '@openthrottle/openthrottle-plan-config';
import { existsSync, statSync } from 'fs';
import { isAbsolute } from 'path';

import type { RunPlanOrchestratorJobData } from '../../../queues/plans/plans.types.ts';
import {
  jobRunHooksForJobPayload,
  resolveJobRunHooksForEnqueue,
} from '../enqueue-plan-job-run-hooks/enqueue-plan-job-run-hooks.utils.ts';
import { applyPlanRunProgrammaticDefaults } from '../enqueue-plan-run-defaults/enqueue-plan-run-defaults.utils.ts';
import type { PlanRunTuningInput } from '../plan.input.ts';

/**
 * RFC 4122 UUID — aligned with developer `isOpenThrottleUuid`.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true when `value` is a plausible OpenThrottle plan/task UUID.
 */
const isOpenThrottlePlanTaskUuid = (value: string): boolean => {
  return UUID_REGEX.test(value.trim());
};

const MAX_TUNING_STRING_LEN = 8192;

/**
 * Max path length for workingDirectory (prevents abuse).
 */
const MAX_WORKING_DIRECTORY_LEN = 4096;

/**
 * One week in seconds — generous cap for the per-attempt agent timeout.
 */
const MAX_ITERATION_TIMEOUT_SECONDS = 7 * 24 * 3600;

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
      `Tuning string fields must be at most ${MAX_TUNING_STRING_LEN} characters`,
    );
  }
  return t;
};

/**
 * Validates the optional `tuning.effort` level against the chat path's vocabulary
 * ({@link CONVERSATION_REASONING_EFFORTS}). Omitted / blank → `undefined` (a strict no-op); a
 * present but unrecognized level throws, naming the accepted set. Unlike the chat resolver, which
 * drops an unknown level, a plan run fails fast so a typo is never silently run at the default.
 */
export const validatePlanRunEffort = (
  value: string | null | undefined,
): ConversationReasoningEffort | undefined => {
  const trimmed = normalizeOptionalString(value);
  if (trimmed === undefined) return undefined;
  const effort = toConversationReasoningEffort(trimmed);
  if (effort === undefined) {
    throw new Error(
      `tuning.effort must be one of: ${Object.values(CONVERSATION_REASONING_EFFORTS).join(', ')}`,
    );
  }
  return effort;
};

/**
 * Normalizes a raw debug level while KEEPING an explicit `'omit'`. Programmatic runs default to
 * `'verbose'` (see {@link applyPlanRunProgrammaticDefaults}), so a caller's deliberate `'omit'`
 * has to survive parsing — dropping it would make "no verbose" indistinguishable from "unset"
 * and hand the run the default back.
 */
const normalizeNestedDebugPreservingOmit = (
  value: string | null | undefined,
): WorkflowConfigDebug | undefined => {
  if (value == null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'debug') return 'debug';
  if (normalized === 'verbose') return 'verbose';
  if (normalized === 'omit') return 'omit';
  return undefined;
};

/**
 * Maps GraphQL {@link PlanRunTuningInput} to worker job tuning, or `undefined` when nothing effective was provided.
 * @throws Error when values are out of range or driver is unknown.
 */
export const parseEnqueuePlanRunTuning = (
  input: PlanRunTuningInput | null | undefined,
): PlanRunTuningSettings | undefined => {
  if (input == null) return undefined;

  const driverRaw = normalizeOptionalString(input.driver);

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
        `tuning.iterationTimeoutSeconds must be an integer from 1 to ${MAX_ITERATION_TIMEOUT_SECONDS} (seconds)`,
      );
    }
    iterationTimeoutSeconds = sec;
  }

  const effort = validatePlanRunEffort(input.effort);
  const model = normalizeOptionalString(input.model);
  const worktreeName = normalizeOptionalString(input.worktreeName);

  const debugCli = normalizeNestedDebugPreservingOmit(input.debugCli);

  const tuning: PlanRunTuningSettings = {
    ...(debugCli !== undefined ? { debug: debugCli } : {}),
    ...(driverRaw !== undefined
      ? { driver: parseWorkflowRunnerId(driverRaw, 'cli') }
      : {}),
    ...(effort !== undefined ? { effort } : {}),
    ...(iterationTimeoutSeconds !== undefined
      ? { iterationTimeoutSeconds }
      : {}),
    ...(model !== undefined ? { model } : {}),
    ...(worktreeName !== undefined ? { worktreeName } : {}),
  };

  if (Object.keys(tuning).length === 0) {
    return undefined;
  }

  return tuning;
};

/**
 * Resolves the driver persisted for the plan run. GraphQL omission falls back to the default driver.
 */
const resolvePlanRunDriver = (
  tuning: PlanRunTuningSettings | undefined,
): WorkflowConfigRunner => {
  return tuning?.driver ?? DEFAULT_PLAN_RUN_DRIVER;
};

/**
 * Builds {@link RunPlanOrchestratorJobData} for the OT Loop runner (plans queue, `run-plan-orchestrator`).
 * @throws Error when ids are invalid or task mode constraints fail.
 */
export const buildRunPlanOrchestratorJobData = (input: {
  readonly jobRunHooksJson?: string | null;
  readonly materializedHookEntries?: readonly JobRunHookEntry[];
  readonly mode?: 'plan' | 'task' | null;
  readonly otLoop?: PlanRunConfigOtLoop | null;
  readonly planId: string;
  readonly planJobRunHooks?: PlanJobRunHooksStorage | null;
  readonly taskId?: string | null;
  readonly tuning?: PlanRunTuningInput | null;
  readonly workingDirectory?: string | null;
}): RunPlanOrchestratorJobData => {
  const planId = input.planId.trim();
  if (!isOpenThrottlePlanTaskUuid(planId)) {
    throw new Error('planId must be a valid OpenThrottle UUID');
  }

  const mode = input.mode ?? null;
  const taskRaw = input.taskId?.trim() ?? '';
  const workingDirectory = validateWorkingDirectory(input.workingDirectory);
  const jobRunHooks = jobRunHooksForJobPayload(
    resolveJobRunHooksForEnqueue({
      enqueueHooksJson: input.jobRunHooksJson,
      materializedHookEntries: input.materializedHookEntries,
      planHooks: input.planJobRunHooks,
      workingDirectory: input.workingDirectory,
    }),
  );
  const jobRunHooksSpread = jobRunHooks !== undefined ? { jobRunHooks } : {};
  const otLoopSpread = input.otLoop != null ? { otLoop: input.otLoop } : {};

  if (mode === 'task') {
    if (taskRaw === '') {
      throw new Error('taskId is required when mode is task');
    }
    if (!isOpenThrottlePlanTaskUuid(taskRaw)) {
      throw new Error('taskId must be a valid OpenThrottle UUID');
    }
    const tuning = applyPlanRunProgrammaticDefaults({
      planId,
      tuning: parseEnqueuePlanRunTuning(input.tuning),
    });
    const driver = resolvePlanRunDriver(tuning);
    return {
      driver,
      mode: 'task',
      planId,
      ...jobRunHooksSpread,
      ...otLoopSpread,
      runKind: 'orchestrator',
      taskId: taskRaw,
      tuning,
      ...(workingDirectory !== undefined ? { workingDirectory } : {}),
    };
  }

  if (taskRaw !== '') {
    throw new Error('taskId is only allowed when mode is task');
  }

  const tuning = applyPlanRunProgrammaticDefaults({
    planId,
    tuning: parseEnqueuePlanRunTuning(input.tuning),
  });
  const driver = resolvePlanRunDriver(tuning);
  const data: RunPlanOrchestratorJobData = {
    driver,
    planId,
    runKind: 'orchestrator',
    ...jobRunHooksSpread,
    ...otLoopSpread,
    ...(mode === 'plan' ? { mode: 'plan' } : {}),
    tuning,
    ...(workingDirectory !== undefined ? { workingDirectory } : {}),
  };
  return data;
};
