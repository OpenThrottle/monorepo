/**
 * @description Zod schemas for the `runner` and `otLoop` keys shared by the storage and snapshot
 * run-config schemas (docs/workflows/ot-loop-job.md § 1).
 */

import { z } from 'zod';

import {
  MAX_PLAN_RUN_OT_LOOP_COMMANDS,
  MAX_PLAN_RUN_OT_LOOP_RETRIES,
  MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN,
  PLAN_RUN_CONFIG_RUNNERS,
} from './plan-run-config-storage.constants.ts';

const otLoopCommandListSchema = z
  .array(z.string().trim().min(1).max(MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN))
  .max(MAX_PLAN_RUN_OT_LOOP_COMMANDS);

export const planRunConfigRunnerSchema = z.enum(PLAN_RUN_CONFIG_RUNNERS);

export const planRunConfigOtLoopSchema = z
  .object({
    finalValidationCommands: otLoopCommandListSchema.optional(),
    maxRetries: z
      .number()
      .int()
      .min(0)
      .max(MAX_PLAN_RUN_OT_LOOP_RETRIES)
      .optional(),
    setupCommands: otLoopCommandListSchema.optional(),
    validationCommands: otLoopCommandListSchema.optional(),
  })
  .strict();
