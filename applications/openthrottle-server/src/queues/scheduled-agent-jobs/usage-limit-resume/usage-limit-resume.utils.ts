import { USAGE_LIMIT_RESUME_JOB_ID_PREFIX } from '../../usage-limit/usage-limit.constants.ts';

/**
 * @description The BullMQ jobId of the continuation for a limited run. Deterministic, so BullMQ
 * itself refuses a second enqueue for the same limited run. Unique per limited run (and a limited
 * run resumes at most once), so a retained completed job with this id can never swallow a legitimate
 * later enqueue — the gotcha documented in `plan-rules-evaluation.service.ts` does not apply.
 */
export const usageLimitResumeJobId = (limitedRunId: string): string => {
  return `${USAGE_LIMIT_RESUME_JOB_ID_PREFIX}${limitedRunId}`;
};
