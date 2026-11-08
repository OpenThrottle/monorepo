import { PLAN_STATUS_FILTER_COPY } from '~/routing/plans/data/data.copy';
import type { PlanStatusKey } from '~/routing/plans/types';

/**
 * @description Groups and display order of the plans Status filter: work still
 * in flight first, then the terminal statuses. Typed as `PlanStatusKey[]` so a
 * misspelled or removed status fails to compile; a spec asserts every status
 * appears exactly once. The flattened order is `PLAN_STATUS_FILTER_ORDER`.
 */
export const PLAN_STATUS_FILTER_GROUPS = [
  {
    heading: PLAN_STATUS_FILTER_COPY.activeGroup,
    statuses: [
      'BACKLOG',
      'PENDING',
      'SCHEDULED',
      'QUEUED',
      'IN_PROGRESS',
      'BLOCKED',
    ],
  },
  {
    heading: PLAN_STATUS_FILTER_COPY.resolvedGroup,
    statuses: ['COMPLETED', 'PROMOTED', 'CANCELED', 'SKIPPED'],
  },
] as const satisfies readonly {
  readonly heading: string;
  readonly statuses: readonly PlanStatusKey[];
}[];
