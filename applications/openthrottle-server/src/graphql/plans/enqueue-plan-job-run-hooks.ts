/**
 * @description Parses and resolves job-run lifecycle hooks for plan storage and BullMQ enqueue.
 */

import type { PlanJobRunHooksStorage } from '@openthrottle/nestjs-repositories';
import type { JobRunHooksConfig } from '@tools/workflows';
import { parseJobRunHooksConfig } from '@tools/workflows';
import { validateWorkingDirectory } from './enqueue-plan-ralph-tuning';

const MAX_JOB_RUN_HOOKS_JSON_LEN = 512_000;

/**
 * @description Serializes stored hooks for GraphQL `jobRunHooksJson`.
 */
export const serializeJobRunHooksForGraphql = (
  stored: PlanJobRunHooksStorage | null | undefined,
): string => JSON.stringify(parseJobRunHooksConfig(stored ?? { hooks: [] }));

/**
 * @description Parses GraphQL JSON into canonical {@link JobRunHooksConfig} for DB or enqueue.
 * @throws Error when JSON is invalid or hook entries fail validation.
 */
export const parseJobRunHooksJsonInput = (
  raw: string | null | undefined,
  options?: {
    readonly cwd?: string;
    readonly requireTargetsExist?: boolean;
  },
): JobRunHooksConfig | undefined => {
  if (raw === undefined || raw === null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (trimmed.length > MAX_JOB_RUN_HOOKS_JSON_LEN) {
    throw new Error(
      `jobRunHooksJson must be at most ${MAX_JOB_RUN_HOOKS_JSON_LEN} characters`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('jobRunHooksJson must be valid JSON');
  }

  return parseJobRunHooksConfig(parsed, options);
};

/**
 * @description Normalizes plan column value (legacy empty/null) to {@link JobRunHooksConfig}.
 */
export const jobRunHooksFromPlanStorage = (
  stored: PlanJobRunHooksStorage | null | undefined,
): JobRunHooksConfig => parseJobRunHooksConfig(stored ?? { hooks: [] });

/**
 * @description Resolves hooks for a queued run: enqueue override wins, else persisted plan hooks.
 */
export const resolveJobRunHooksForEnqueue = (params: {
  readonly enqueueHooksJson?: string | null;
  readonly planHooks: PlanJobRunHooksStorage | null | undefined;
  readonly workingDirectory?: string | null;
}): JobRunHooksConfig | undefined => {
  const cwd =
    validateWorkingDirectory(params.workingDirectory) ??
    (process.env.WORKSPACE_ROOT?.trim() || process.cwd());
  const validateOpts = { cwd, requireTargetsExist: true as const };

  const override = parseJobRunHooksJsonInput(
    params.enqueueHooksJson,
    validateOpts,
  );
  if (override !== undefined) {
    return override.hooks.length > 0 ? override : undefined;
  }

  const fromPlan = jobRunHooksFromPlanStorage(params.planHooks);
  return fromPlan.hooks.length > 0 ? fromPlan : undefined;
};

/**
 * @description Strips empty hook lists so BullMQ payloads stay backward compatible.
 */
export const jobRunHooksForJobPayload = (
  config: JobRunHooksConfig | undefined,
): JobRunHooksConfig | undefined =>
  config !== undefined && config.hooks.length > 0 ? config : undefined;
