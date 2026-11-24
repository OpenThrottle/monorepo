/**
 * @description Validates and serializes `plan_runs.run_config_snapshot` JSON.
 */

import { z } from 'zod';

import { planRunConfigOtLoopShape } from './plan-run-config-ot-loop.validation.ts';
import { PLAN_RUN_CONFIG_SNAPSHOT_VERSION } from './plan-run-config-snapshot.constants.ts';
import type { PlanRunConfigSnapshot } from './plan-run-config-snapshot.types.ts';
import {
  MAX_PLAN_RUN_STRING_FIELD_LEN,
  MAX_PLAN_RUN_WORKING_DIRECTORY_LEN,
  PLAN_RUN_CONFIG_UUID_REGEX,
  PLAN_RUN_KNOWN_DRIVERS,
} from './plan-run-config-storage.constants.ts';

const trimToMax = (max: number) => {
  return z
    .string()
    .max(max)
    .transform((s) => s.trim());
};

const planRunConfigSnapshotRunV1Schema = z
  .object({
    ...planRunConfigOtLoopShape,
    debug: z.enum(['debug', 'omit', 'verbose']).optional(),
    driver: z.enum(PLAN_RUN_KNOWN_DRIVERS),
    effort: trimToMax(MAX_PLAN_RUN_STRING_FIELD_LEN).optional(),
    iterationTimeoutSeconds: z.number().int().min(1).optional(),
    model: trimToMax(MAX_PLAN_RUN_STRING_FIELD_LEN).optional(),
    worktreeName: trimToMax(MAX_PLAN_RUN_STRING_FIELD_LEN).optional(),
  })
  .strict();

const planRunConfigSnapshotV1Schema = z
  .object({
    jobRunHooks: z
      .object({
        hooks: z.array(z.unknown()),
      })
      .strict()
      .optional(),
    run: planRunConfigSnapshotRunV1Schema,
    target: z
      .object({
        mode: z.enum(['plan', 'task']),
        taskId: trimToMax(MAX_PLAN_RUN_STRING_FIELD_LEN),
      })
      .strict(),
    version: z.literal(PLAN_RUN_CONFIG_SNAPSHOT_VERSION),
    workspace: z
      .object({
        checkoutId: trimToMax(MAX_PLAN_RUN_STRING_FIELD_LEN).optional(),
        repositoryId: trimToMax(MAX_PLAN_RUN_STRING_FIELD_LEN).optional(),
        workingDirectory: trimToMax(MAX_PLAN_RUN_WORKING_DIRECTORY_LEN),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.target.mode === 'task' && value.target.taskId === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'target.taskId is required when target.mode is task',
        path: ['target', 'taskId'],
      });
    }

    if (
      value.target.mode === 'task' &&
      value.target.taskId !== '' &&
      !PLAN_RUN_CONFIG_UUID_REGEX.test(value.target.taskId)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'target.taskId must be a valid UUID when target.mode is task',
        path: ['target', 'taskId'],
      });
    }
  });

/**
 * @description Parses stored snapshot JSON; returns null for legacy rows without a snapshot.
 */
export const parsePlanRunConfigSnapshot = (
  stored: unknown,
): PlanRunConfigSnapshot | null => {
  if (stored == null) return null;
  return planRunConfigSnapshotV1Schema.parse(stored);
};

/**
 * @description Serializes snapshot for GraphQL `runConfigSnapshotJson`.
 */
export const serializePlanRunConfigSnapshotForGraphql = (
  stored: PlanRunConfigSnapshot | null | undefined,
): string | null => {
  if (stored == null) return null;
  return JSON.stringify(stored);
};
