import { z } from 'zod/v3';

/**
 * @description Form shape for the temporary plan-workflow action: a required
 * plan id and a branch that defaults to `main` when blank.
 */
export const PlanTempFormSchema = z.object({
  branch: z.string().default('main'),
  planId: z.string().min(1),
});
