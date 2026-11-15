import { z } from 'zod/v3';

/**
 * @description Form shape for the queues index pause / resume action. `intent`
 * is part of the schema (callers parse with `allow: []`) so an unknown intent is
 * a structured validation error instead of a silent no-op.
 */
export const QueueControlFormSchema = z.object({
  intent: z.enum(['pauseQueue', 'resumeQueue']),
  queueName: z.string().min(1),
});
