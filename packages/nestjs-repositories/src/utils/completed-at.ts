/**
 * @description Pure helper for `plans.completed_at` / `tasks.completed_at` write-path
 * semantics. Stamp once on transition into COMPLETED; clear when leaving COMPLETED;
 * leave unchanged on later edits or idempotent same-status writes. Not maintained by
 * DB `updated_at` triggers — callers must apply this in app code.
 */

const COMPLETED_STATUS = 'COMPLETED';

/**
 * @description Normalizes a status string for completed_at transition checks.
 */
function normalizeStatus(status: string): string {
  return status.trim().toUpperCase();
}

export interface ResolveCompletedAtForStatusChangeInput {
  readonly currentCompletedAt: Date | null;
  readonly nextStatus: string;
  readonly now?: Date;
  readonly previousStatus: string;
}

/**
 * @description Resolves the next `completedAt` value for a status change.
 * - Entering COMPLETED → `now` (does not overwrite if already COMPLETED).
 * - Leaving COMPLETED → `null`.
 * - Otherwise → keep `currentCompletedAt`.
 * @public
 */
export function resolveCompletedAtForStatusChange(
  input: ResolveCompletedAtForStatusChangeInput,
): Date | null {
  const previous = normalizeStatus(input.previousStatus);
  const next = normalizeStatus(input.nextStatus);

  if (next === COMPLETED_STATUS && previous !== COMPLETED_STATUS) {
    return input.now ?? new Date();
  }

  if (next !== COMPLETED_STATUS && previous === COMPLETED_STATUS) {
    return null;
  }

  return input.currentCompletedAt;
}
