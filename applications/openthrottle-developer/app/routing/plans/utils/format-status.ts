/**
 * @description Maps a plan/task status to its display label. Delegates to the
 * single UI label source ({@link planStatusValues}) so labels never drift; falls
 * back to the raw value for an unknown status.
 */
import { planStatusValues } from '~/routing/plans/types';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';

/**
 * @description Returns a human-readable label for a plan/task status (e.g. IN_PROGRESS → "In Progress"). Falls back to the raw value if unknown.
 */
export function formatPlanTaskStatus(status: string): string {
  return isPlanStatusKey(status) ? planStatusValues[status] : status;
}
