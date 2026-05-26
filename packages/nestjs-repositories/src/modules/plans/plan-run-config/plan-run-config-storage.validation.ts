/**
 * @description Validates `plans.run_config` JSON (mirrors job_run_hooks parse pattern in openthrottle-server).
 */

import { z } from 'zod';
import {
  MAX_PLAN_RUN_CONFIG_JSON_LEN,
  MAX_PLAN_RUN_ITERATIONS,
  MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN,
  MAX_PLAN_RUN_WORKING_DIRECTORY_LEN,
  PLAN_RUN_CONFIG_UUID_REGEX,
  PLAN_RUN_CONFIG_VERSION,
  PLAN_RUN_DEBUG_CLI,
  PLAN_RUN_CONFIG_TARGET_MODES,
  PLAN_RUN_KNOWN_BACKENDS,
  PLAN_RUN_PROMPT_LAYERS,
  PLAN_RUN_WORKTREE_CLI,
} from './plan-run-config-storage.constants';
import { getDefaultPlanRunConfigStorage } from './plan-run-config-storage.defaults';
import type { PlanRunConfigStorage } from './plan-run-config-storage.types';

const trimToMax = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim());

const planRunConfigRalphV1Schema = z
  .object({
    debugCli: z.enum(PLAN_RUN_DEBUG_CLI),
    executionBackend: z.enum(PLAN_RUN_KNOWN_BACKENDS),
    iterationTimeoutText: trimToMax(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN),
    iterations: z
      .number()
      .int()
      .min(1)
      .max(MAX_PLAN_RUN_ITERATIONS),
    model: trimToMax(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN),
    project: trimToMax(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN),
    prompt: trimToMax(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN),
    promptFile: trimToMax(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN),
    promptLayer: z.enum(PLAN_RUN_PROMPT_LAYERS),
    skipWorktreeSetup: z.boolean(),
    worktreeBase: trimToMax(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN),
    worktreeCli: z.enum(PLAN_RUN_WORKTREE_CLI),
    worktreeName: trimToMax(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN),
  })
  .strict();

const planRunConfigStorageV1Schema = z
  .object({
    ralph: planRunConfigRalphV1Schema,
    target: z
      .object({
        mode: z.enum(PLAN_RUN_CONFIG_TARGET_MODES),
        taskId: trimToMax(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN),
      })
      .strict(),
    version: z.literal(PLAN_RUN_CONFIG_VERSION),
    workspace: z
      .object({
        workingDirectory: trimToMax(MAX_PLAN_RUN_WORKING_DIRECTORY_LEN),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const timeoutRaw = value.ralph.iterationTimeoutText;
    if (timeoutRaw !== '') {
      const n = Number.parseInt(timeoutRaw, 10);
      if (Number.isNaN(n) || n < 1) {
        ctx.addIssue({
          code: 'custom',
          message:
            'ralph.iterationTimeoutText must be empty or a positive integer (seconds)',
          path: ['ralph', 'iterationTimeoutText'],
        });
      }
    }

    if (value.target.mode === 'task') {
      const taskId = value.target.taskId;
      if (!PLAN_RUN_CONFIG_UUID_REGEX.test(taskId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'target.taskId must be a UUID when target.mode is task',
          path: ['target', 'taskId'],
        });
      }
    }

    const wd = value.workspace.workingDirectory;
    if (wd !== '' && !wd.startsWith('/')) {
      ctx.addIssue({
        code: 'custom',
        message:
          'workspace.workingDirectory must be empty (monorepo root) or an absolute path',
        path: ['workspace', 'workingDirectory'],
      });
    }
  });

/**
 * @description Parses unknown JSON into canonical {@link PlanRunConfigStorage}.
 * @throws Error when validation fails.
 */
export const parsePlanRunConfigStorage = (
  parsed: unknown,
): PlanRunConfigStorage => {
  const result = planRunConfigStorageV1Schema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`run_config validation failed: ${detail}`);
  }

  return result.data;
};

/**
 * @description Parses GraphQL / API JSON string into {@link PlanRunConfigStorage}.
 * Pass `null` to reset to the default v1 shell.
 */
export const parsePlanRunConfigJson = (
  raw: string | null | undefined,
): PlanRunConfigStorage | undefined => {
  if (raw === undefined) {
    return undefined;
  }

  if (raw === null) {
    return getDefaultPlanRunConfigStorage();
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return undefined;
  }

  if (trimmed.length > MAX_PLAN_RUN_CONFIG_JSON_LEN) {
    throw new Error(
      `runConfigJson must be at most ${MAX_PLAN_RUN_CONFIG_JSON_LEN} characters`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error('runConfigJson must be valid JSON');
  }

  return parsePlanRunConfigStorage(parsed);
};

/**
 * @description Normalizes plan column value (legacy `{"version":1}` shell or null) to {@link PlanRunConfigStorage}.
 */
export const planRunConfigFromPlanStorage = (
  stored: unknown,
  options?: { readonly planId?: string },
): PlanRunConfigStorage => {
  try {
    return parsePlanRunConfigStorage(stored);
  } catch {
    return getDefaultPlanRunConfigStorage(options);
  }
};

/**
 * @description Serializes stored config for GraphQL `runConfigJson`.
 */
export const serializePlanRunConfigForGraphql = (
  stored: PlanRunConfigStorage | null | undefined,
  options?: { readonly planId?: string },
): string =>
  JSON.stringify(
    stored !== undefined && stored !== null
      ? planRunConfigFromPlanStorage(stored, options)
      : getDefaultPlanRunConfigStorage(options),
  );
