import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';
import { PlanStatusKey, planStatusValues } from '~/routing/plans/types';

/**
 * @description Left-to-right Kanban order for plan task board columns
 * (matches API enum keys).
 */
export const PLAN_TASK_BOARD_COLUMN_ORDER: readonly PlanStatusKey[] = [
  'BACKLOG',
  'QUEUED',
  'PENDING',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'CANCELED',
  'SKIPPED',
] as const;

const UNKNOWN_KEY = 'UNKNOWN' as const;

export type PlanTaskBoardGroupKey = PlanStatusKey | typeof UNKNOWN_KEY;

/**
 * @description Groups tasks by status into columns; unknown statuses go under {@link UNKNOWN_KEY}.
 */
export function groupPlanTasksByStatus(
  tasks: readonly PlanTaskRowFragment[],
): ReadonlyMap<PlanTaskBoardGroupKey, PlanTaskRowFragment[]> {
  const map = new Map<PlanTaskBoardGroupKey, PlanTaskRowFragment[]>();

  for (const status of PLAN_TASK_BOARD_COLUMN_ORDER) {
    map.set(status, []);
  }

  map.set(UNKNOWN_KEY, []);

  for (const task of tasks) {
    const status = task.status;

    if (isPlanStatusKey(status)) {
      map.get(status)?.push(task);
    } else {
      map.get(UNKNOWN_KEY)?.push(task);
    }
  }

  return map;
}

/**
 * @description Column title for a board group (human-readable).
 */
export function getPlanTaskBoardColumnTitle(
  key: PlanTaskBoardGroupKey,
): string {
  if (key === UNKNOWN_KEY) {
    return 'Other';
  }

  return planStatusValues[key];
}

/**
 * @description Stable `columnId` for tests and `aria-labelledby`
 * (lowercase enum-style).
 */
export function getPlanTaskBoardColumnId(key: PlanTaskBoardGroupKey): string {
  if (key === UNKNOWN_KEY) {
    return 'unknown';
  }

  return key.toLowerCase();
}
