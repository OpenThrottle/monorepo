import {
  USAGE_LIMIT_RESUME_BUFFER_MS,
  USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
  USAGE_LIMIT_RESUME_MAX_HORIZON_MS,
  USAGE_LIMIT_RESUME_PAST_TOLERANCE_MS,
} from './usage-limit.constants.ts';

/** @description The slice of a usage limit the resume decision needs. */
interface UsageLimitResumeInput {
  /** ISO-8601 reset instant; null when the agent CLI did not report one. */
  readonly resetsAt: string | null;
}

/**
 * @description Whether a usage-limited run is continued automatically. `resume` carries how long to
 * delay the continuation job; `hold` carries a human-readable reason that is shown to the user.
 */
export type UsageLimitResumeDecision =
  | { readonly delayMs: number; readonly kind: 'resume' }
  | { readonly kind: 'hold'; readonly reason: string };

/**
 * @description Pure policy for resuming a plan run that stopped on a subscription usage limit.
 * Resumes when the reset time is known, is not implausibly far in the past, is within
 * {@link USAGE_LIMIT_RESUME_MAX_HORIZON_MS} of `now`, and the continuation chain has not already
 * hit {@link USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH} limited runs. The delay is the time until the reset
 * (never negative) plus {@link USAGE_LIMIT_RESUME_BUFFER_MS}.
 *
 * `chainDepth` counts the USAGE_LIMITED runs on the chain ending at the run that just stopped,
 * that run included.
 */
export const decideUsageLimitResume = (params: {
  readonly chainDepth: number;
  readonly limit: UsageLimitResumeInput;
  readonly now: Date;
}): UsageLimitResumeDecision => {
  const { chainDepth, limit, now } = params;

  if (limit.resetsAt === null) {
    return { kind: 'hold', reason: 'the reset time is unknown' };
  }

  const resetsAtMs = Date.parse(limit.resetsAt);
  if (Number.isNaN(resetsAtMs)) {
    return { kind: 'hold', reason: 'the reset time could not be read' };
  }

  const untilResetMs = resetsAtMs - now.getTime();

  if (untilResetMs > USAGE_LIMIT_RESUME_MAX_HORIZON_MS) {
    return {
      kind: 'hold',
      reason: 'the reset is more than 24 hours away',
    };
  }

  if (untilResetMs < -USAGE_LIMIT_RESUME_PAST_TOLERANCE_MS) {
    return {
      kind: 'hold',
      reason: 'the reported reset time is already well in the past',
    };
  }

  if (chainDepth >= USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH) {
    return {
      kind: 'hold',
      reason: `it has already been resumed after ${USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH - 1} usage limits`,
    };
  }

  return {
    delayMs: Math.max(0, untilResetMs) + USAGE_LIMIT_RESUME_BUFFER_MS,
    kind: 'resume',
  };
};

/**
 * @description Scheduled-agent-job variant of {@link decideUsageLimitResume}: everything the base
 * policy decides, plus one rule only a cron-driven job has. A scheduled job fires again on its own,
 * so when its next cron fire is at or before the moment the continuation would start (now plus the
 * delay), the schedule supersedes the continuation and the run is held rather than resumed. A job
 * with no known next fire (`nextRunAt === null`) is resumed on the base policy alone.
 */
export const decideScheduledUsageLimitResume = (params: {
  readonly chainDepth: number;
  readonly limit: UsageLimitResumeInput;
  readonly nextRunAt: Date | null;
  readonly now: Date;
}): UsageLimitResumeDecision => {
  const { nextRunAt, ...base } = params;
  const decision = decideUsageLimitResume(base);

  if (decision.kind === 'hold' || nextRunAt === null) {
    return decision;
  }

  const resumeAtMs = params.now.getTime() + decision.delayMs;

  if (nextRunAt.getTime() <= resumeAtMs) {
    return { kind: 'hold', reason: 'the next scheduled run is sooner' };
  }

  return decision;
};
