export interface RecordStatusChangeParams {
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
  readonly entity: 'plan' | 'task';
  readonly from: string | null;
  readonly id: string;
  readonly planId: string;
  /**
   * Reuse an already-resolved session id instead of resolving ambient-or-instant again — set by a
   * bulk writer ({@link applyBulkTaskStatusChange}) that resolves the session ONCE via
   * {@link WorkLedgerCaptureService.resolveSessionId} for the (identical) actor shared by every row
   * in one bulk call, so one reset of N tasks does not mint N instant work sessions. Single-row
   * callers omit this and get the usual ambient-or-instant resolution.
   */
  readonly sessionId?: string | undefined;
  readonly taskId: string | null;
  readonly to: string;
}
