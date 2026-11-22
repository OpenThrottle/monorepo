import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import type { PlanRun } from '@openthrottle/nestjs-repositories-server';
import { PLAN_RUN_STATUS } from '@openthrottle/nestjs-repositories-server';
import type { PlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { buildRalphPlanRunTuningFromPlanRunConfig } from '@openthrottle/openthrottle-plan-config';

import type { RalphPlanRunTuningInput } from '../../graphql/plans/plan.input.ts';
import {
  PROJECT_RUN_JOB_ID_PREFIX,
  PROJECT_RUN_SETTLE_GRACE_MS,
  PROJECT_RUN_WAITING_PLAN_RUN_STATUSES,
} from './project-run-advance.constants.ts';
import type {
  PlanRunEvidence,
  PlanRunVerdict,
} from './project-run-advance.types.ts';

const DEBUG_CLI_VALUES = ['debug', 'omit', 'verbose'] as const;

type DebugCliValue = (typeof DEBUG_CLI_VALUES)[number];

const isDebugCliValue = (value: unknown): value is DebugCliValue => {
  return DEBUG_CLI_VALUES.some((candidate) => {
    return candidate === value;
  });
};

const readString = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined => {
  const value = record[key];

  return typeof value === 'string' ? value : undefined;
};

const readNumber = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): number | undefined => {
  const value = record[key];

  return typeof value === 'number' ? value : undefined;
};

const readBoolean = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): boolean | undefined => {
  const value = record[key];

  return typeof value === 'boolean' ? value : undefined;
};

/**
 * @description The enqueue tuning a plan's stored run configuration implies: the same mapping the
 * plan page's Run button sends (`buildRalphPlanRunTuningFromPlanRunConfig`), typed as the GraphQL
 * input. Null when every field is at its default, so the enqueue applies its own defaults.
 */
export const toRalphTuningInput = (
  config: PlanRunConfigStorage,
): RalphPlanRunTuningInput | null => {
  const tuning = buildRalphPlanRunTuningFromPlanRunConfig(config);

  if (tuning === undefined) {
    return null;
  }

  const debugCli = tuning.ralphDebugCli;

  return {
    backend: readString(tuning, 'backend'),
    effort: readString(tuning, 'effort'),
    iterationTimeoutSeconds: readNumber(tuning, 'iterationTimeoutSeconds'),
    iterations: readNumber(tuning, 'iterations'),
    model: readString(tuning, 'model'),
    project: readString(tuning, 'project'),
    prompt: readString(tuning, 'prompt'),
    promptFile: readString(tuning, 'promptFile'),
    ralphDebugCli: isDebugCliValue(debugCli) ? debugCli : undefined,
    skipWorktreeSetup: readBoolean(tuning, 'skipWorktreeSetup'),
    worktree: readString(tuning, 'worktree'),
    worktreeBase: readString(tuning, 'worktreeBase'),
  };
};

/**
 * @description The idempotency key (and BullMQ job id) of the plan run a project run enqueues for a
 * plan. Deterministic, so two racing advancers enqueue the same job.
 */
export const buildProjectRunJobId = (
  projectRunId: string,
  planId: string,
): string => {
  return `${PROJECT_RUN_JOB_ID_PREFIX}${projectRunId}-${planId}`;
};

/**
 * @description Whether a settled plan run is still inside the grace window in which the writes that
 * follow a settle (its PR artifact, a usage-limit continuation) may yet land.
 */
export const isWithinSettleGrace = (run: PlanRun, now: Date): boolean => {
  return now.getTime() - run.updatedAt.getTime() < PROJECT_RUN_SETTLE_GRACE_MS;
};

/**
 * @description The human-readable reason a plan run stops a project run: its status, plus the
 * reason the run recorded when it has one.
 */
export const describeStoppingRun = (run: PlanRun): string => {
  const base = `Plan run ${run.id} settled ${run.status}`;

  if (run.settledReason == null || run.settledReason.trim() === '') {
    return `${base}.`;
  }

  return `${base}: ${run.settledReason.trim()}`;
};

/**
 * @description The status-change attribution for writes made on a user's behalf: that user, or
 * none for a system/service-account run.
 */
export const actorOf = (
  userId: string | null,
): {
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
} => {
  if (userId === null) {
    return { actorKind: undefined, actorSub: undefined };
  }

  return { actorKind: AUTH_PRINCIPAL_KIND_USER, actorSub: userId };
};

/**
 * @description A stored workspace field, with the empty string the config uses for "unset" read as null.
 */
export const emptyToNull = (value: string): string | null => {
  return value.trim() === '' ? null : value;
};

/**
 * @description Whether a `SELECT pg_try_advisory_lock(...) AS locked` result reports the lock taken.
 */
export const isLockAcquired = (rows: unknown): boolean => {
  if (!Array.isArray(rows)) {
    return false;
  }

  const first: unknown = rows[0];

  return (
    typeof first === 'object' &&
    first !== null &&
    'locked' in first &&
    first.locked === true
  );
};

/**
 * @description The advance step's verdict on the plan run a project run started for a plan: still
 * going (`wait`), finished with a draft PR (`done`), or ended any other way (`stop`). A usage-limited
 * run is not the end: the verdict follows `resume_of_run_id` to its continuation. A COMPLETED run
 * with no PR yet, and a limited run with no continuation yet, wait out the settle grace first, since
 * both are written just after the settle.
 */
export const judgePlanRun = (
  planRun: PlanRun,
  evidence: PlanRunEvidence,
): PlanRunVerdict => {
  if (PROJECT_RUN_WAITING_PLAN_RUN_STATUSES.includes(planRun.status)) {
    return { kind: 'wait', planRunId: planRun.id };
  }

  if (planRun.status === PLAN_RUN_STATUS.USAGE_LIMITED) {
    const continuation = evidence.continuationByRunId.get(planRun.id);

    if (continuation !== undefined) {
      return judgePlanRun(continuation, evidence);
    }

    if (isWithinSettleGrace(planRun, evidence.now)) {
      return { kind: 'wait', planRunId: planRun.id };
    }

    return {
      kind: 'stop',
      reason: `Plan run ${planRun.id} hit a usage limit and no continuation run followed.`,
    };
  }

  if (planRun.status === PLAN_RUN_STATUS.COMPLETED) {
    if (evidence.runIdsWithPullRequest.has(planRun.id)) {
      return { kind: 'done' };
    }

    if (isWithinSettleGrace(planRun, evidence.now)) {
      return { kind: 'wait', planRunId: planRun.id };
    }

    return {
      kind: 'stop',
      reason: `Plan run ${planRun.id} settled COMPLETED without a pull request.`,
    };
  }

  return { kind: 'stop', reason: describeStoppingRun(planRun) };
};
