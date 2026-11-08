import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { EntityManager } from 'typeorm';

import type { WorkLedgerCaptureService } from '../work-ledger-capture/work-ledger-capture.service.ts';

/** One row this bulk write actually changed: its id and its status just before the write. */
export interface BulkTaskStatusChangeRow {
  readonly fromStatus: string;
  readonly taskId: string;
}

export interface ApplyBulkTaskStatusChangeParams {
  /** Request-principal actor kind, or `AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT` for a background writer. */
  readonly actorKind: string | undefined;
  /** Request-principal actor sub, or a resolved system-account id for a background writer. */
  readonly actorSub: string | undefined;
  /**
   * True to rethrow a capture failure (rolling back the caller's transaction, and every row this
   * call already updated with it); false to log it behind {@link WORK_LEDGER_CAPTURE_FAILED_MARKER}
   * and leave the row write in place — mirrors
   * {@link import('../../plans/plan-status/plan-status.service.ts').ApplyStatusChangeParams.captureFailureIsFatal}
   * for the single-row plan-status chokepoint.
   */
  readonly captureFailureIsFatal: boolean;
  /** Only tasks currently in one of these statuses are selected, locked, and updated. */
  readonly fromStatuses: readonly string[];
  readonly logger: LoggerService;
  readonly manager: EntityManager;
  readonly planId: string;
  readonly toStatus: string;
  readonly workLedgerCapture: WorkLedgerCaptureService;
}
