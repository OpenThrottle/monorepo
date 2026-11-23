/**
 * @description Zod shape of the OT Loop validation fields (`setupCommands`, `validationCommands`,
 * `finalValidationCommands`, `maxRetries`) shared by the storage and snapshot `run` blocks
 * (docs/workflows/ot-loop-job.md § 1).
 */

import { z } from 'zod';

import {
  MAX_PLAN_RUN_OT_LOOP_COMMANDS,
  MAX_PLAN_RUN_OT_LOOP_RETRIES,
  MAX_PLAN_RUN_STRING_FIELD_LEN,
} from './plan-run-config-storage.constants.ts';

const otLoopCommandListSchema = z
  .array(z.string().trim().min(1).max(MAX_PLAN_RUN_STRING_FIELD_LEN))
  .max(MAX_PLAN_RUN_OT_LOOP_COMMANDS);

export const planRunConfigOtLoopShape = {
  finalValidationCommands: otLoopCommandListSchema.optional(),
  maxRetries: z
    .number()
    .int()
    .min(0)
    .max(MAX_PLAN_RUN_OT_LOOP_RETRIES)
    .optional(),
  setupCommands: otLoopCommandListSchema.optional(),
  validationCommands: otLoopCommandListSchema.optional(),
};
