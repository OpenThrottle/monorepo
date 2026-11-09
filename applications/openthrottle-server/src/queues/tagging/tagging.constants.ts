import { z } from 'zod';

/** Queue name for the LLM tagging jobs (predict on create, refine on link_commit). */
export const TAGGING_QUEUE_NAME = 'tagging';

/** Job name: closed-vocabulary classification of a newly created plan/task. */
export const TAGGING_PREDICT_JOB_NAME = 'predict';

/** Job name: domain-tag reconciliation against a landed squash diff. */
export const TAGGING_REFINE_JOB_NAME = 'refine';

/** Worker concurrency: each job is one model call + a few tag writes. */
export const TAGGING_WORKER_CONCURRENCY = 2;

/** Predict caps per the design: 0–5 domain tags and at most one phase tag. */
export const TAGGING_MAX_DOMAIN_TAGS = 5;

/** Character budget for inlined patches in refine-tagging model input. */
export const TAGGING_DIFF_PATCH_BUDGET_CHARS = 8_000;
/** Strict schema for the model's JSON response. */
export const taggingModelResponseSchema = z
  .object({
    tags: z
      .array(
        z
          .object({
            confidence: z.number().min(0).max(1).default(0.5),
            dimension: z.enum(['domain', 'phase']),
            tag: z.string().min(1),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export const TAGGING_ENTITY_TYPES = {
  PLAN: 'plan',
  TASK: 'task',
} as const;
