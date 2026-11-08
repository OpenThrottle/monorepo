import type { Plan } from '@openthrottle/nestjs-repositories';

import type { CANCEL_PLAN_RUN_OUTCOME } from './plan-status.constants.ts';
export type CancelPlanRunOutcome =
  (typeof CANCEL_PLAN_RUN_OUTCOME)[keyof typeof CANCEL_PLAN_RUN_OUTCOME];

/**
 * @description Parameters for {@link PlanStatusService.applyStatusChange}. `entity` is the caller's
 * already-loaded row: on a valid transition the chokepoint mutates its `status`/`completedAt` in
 * place and leaves persistence to the caller (so a multi-field caller like `updatePlan` can fold the
 * change into one `manager.save`, while a status-only caller can `manager.save`/`manager.update` the
 * same entity right after).
 */
export interface ApplyStatusChangeParams {
  /** Request-principal actor kind, or `AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT` for a background writer. */
  readonly actorKind: string | undefined;
  /** Request-principal sub, or a `StatusChangeSystemAccountService.resolveId()` id for a background writer. */
  readonly actorSub: string | undefined;
  /**
   * True when a work-ledger capture failure must roll back the transaction (user-facing mutations,
   * which run this inside their own `manager.transaction`). False lets a background writer log the
   * failure and still commit the row update — set by later tasks that route background callers here.
   */
  readonly captureFailureIsFatal: boolean;
  /** The caller's already-loaded row; mutated in place on a valid transition. */
  readonly entity: Plan;
  readonly requestedStatus: string;
  /**
   * True to throw on a forbidden IN_PROGRESS transition or on COMPLETED while tasks remain
   * unresolved (user-facing `setStatus` / `updatePlan`). False to return `{ applied: false }`
   * instead (background `writeGuardedStatus` writers — processor settle, parent-plan reconcile)
   * so a worker is not crashed by a BadRequestException.
   */
  readonly throwOnForbiddenInProgress: boolean;
}

/** @description Result of {@link PlanStatusService.applyStatusChange}. */
export type ApplyStatusChangeResult =
  | { readonly applied: false }
  | {
      readonly applied: true;
      /** The SCHEDULED runs cancelled because the plan left SCHEDULED (D7); usually empty. */
      readonly cancelledScheduledRunIds: readonly string[];
      readonly fromStatus: string;
      readonly toStatus: string;
    };

/**
 * @description Actor to attribute a chokepoint-routed status write to: a request principal's
 * `kind`/`sub` (from `@CurrentUser`), or `AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT` paired with
 * {@link StatusChangeSystemAccountService.resolveId} for a background BullMQ writer.
 */
export interface StatusChangeActor {
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
}

/** Parameters for {@link PlanStatusService.releaseScheduledPlan}. */
export interface ReleaseScheduledPlanParams extends StatusChangeActor {
  readonly captureFailureIsFatal: boolean;
  readonly planId: string;
}

/** Parameters for {@link PlanStatusService.writeGuardedStatus}. */
export interface WriteGuardedStatusParams {
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
  readonly captureFailureIsFatal: boolean;
  /**
   * When set, the write is skipped unless the freshly-locked row's current status equals this
   * value (a string) or is one of these values (a readonly array) — mirrors a guarded
   * `UPDATE … WHERE status = <guardCurrentStatus>` / `IN (…)` without giving up the row lock's
   * freshness. `undefined` means no extra guard beyond
   * {@link PlanStatusService.applyStatusChange}'s own transition policy.
   */
  readonly guardCurrentStatus: string | readonly string[] | undefined;
  readonly requestedStatus: string;
  readonly throwOnForbiddenInProgress: boolean;
}
