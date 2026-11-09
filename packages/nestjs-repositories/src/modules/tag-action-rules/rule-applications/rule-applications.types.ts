import { type EntityManager } from 'typeorm';

import type { RuleApplicationState } from '../rule-application.entity.ts';

/** @public */
export interface RecordRuleApplicationInput {
  readonly details?: unknown;
  readonly planId: string;
  readonly ruleId: string;
  readonly state: RuleApplicationState;
  readonly taskId?: string | null;
}

/**
 * @description Parameters {@link OrphanedTaskStatusCapture} receives for one soft-closed task.
 * `fromStatus` is that task's own real prior status (never a guess).
 * @public
 */
export interface OrphanedTaskStatusCaptureParams {
  readonly fromStatus: string;
  readonly manager: EntityManager;
  readonly planId: string;
  readonly taskId: string;
}

/**
 * @description Work-ledger capture hook for {@link RuleApplicationsService.orphanUnmatchedApplications}'s
 * task soft-close, supplied by the caller as a plain function rather than resolved via DI.
 *
 * This package cannot depend on `WorkLedgerCaptureService` (it lives in `openthrottle-server`, a
 * layer above this package), so the capture itself is delegated back to the caller instead of a
 * DI-injected port — the caller already has the concrete service and the actor/fatality policy to
 * apply. `params.manager` is the SAME transactional manager the soft-close update runs under, so
 * the ledger-row flip, the task status write, and every capture the caller performs here commit or
 * roll back together, exactly as before this hook existed.
 * @public
 */
export type OrphanedTaskStatusCapture = (
  params: OrphanedTaskStatusCaptureParams,
) => Promise<void>;
