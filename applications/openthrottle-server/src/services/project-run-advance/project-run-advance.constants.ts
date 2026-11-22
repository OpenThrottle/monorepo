import {
  PLAN_RUN_STATUS,
  PLAN_STATUS,
} from '@openthrottle/nestjs-repositories-server';

/**
 * Plan statuses a project run passes over: the plan is finished (or will not be worked on), so
 * the run moves to the next one without enqueuing it.
 */
export const PROJECT_RUN_PASSED_OVER_PLAN_STATUSES: readonly string[] = [
  PLAN_STATUS.CANCELED,
  PLAN_STATUS.COMPLETED,
  PLAN_STATUS.SKIPPED,
];

/** Plan-run statuses that are still running, or about to: the project run waits on them. */
export const PROJECT_RUN_WAITING_PLAN_RUN_STATUSES: readonly string[] = [
  PLAN_RUN_STATUS.IN_PROGRESS,
  PLAN_RUN_STATUS.QUEUED,
  PLAN_RUN_STATUS.SCHEDULED,
];

/**
 * How long after a plan run settles the advance step keeps waiting for what settling writes next:
 * a COMPLETED run's pull_request artifact (the settle-time ledger write, or the forge backstop) and
 * a USAGE_LIMITED run's continuation row. Past it, a COMPLETED run with no PR, or a limited run with
 * no continuation, stops the project run.
 */
export const PROJECT_RUN_SETTLE_GRACE_MS = 5 * 60 * 1_000;

/**
 * The idempotency-key prefix of a plan run a project run enqueues. The key is
 * `<prefix><projectRunId>-<planId>`, so a second advancer racing the first lands on the same BullMQ
 * job and plan_runs row instead of double-running the plan.
 */
export const PROJECT_RUN_JOB_ID_PREFIX = 'project-run-';

/** Branch a project run's plan run operates on when its repository records no default branch. */
export const PROJECT_RUN_FALLBACK_BRANCH = 'main';

/** Matches any id: the "except" argument when asking whether a plan has ANY active run. */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';
