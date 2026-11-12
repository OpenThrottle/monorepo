import { describe, expect, test } from 'vitest';

import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

import { getPlanRunStatusBadgeVariant } from '../getPlanRunStatusBadgeVariant';

describe('getPlanRunStatusBadgeVariant', () => {
  test.each([
    ['CANCELLED', 'slate', PLAN_RUN_STATUS_CELL_COPY.cancelledBadge],
    ['COMPLETED', 'green', PLAN_RUN_STATUS_CELL_COPY.completedBadge],
    ['FAILED', 'red', PLAN_RUN_STATUS_CELL_COPY.failedBadge],
    ['IN_PROGRESS', 'blue', PLAN_RUN_STATUS_CELL_COPY.inProgressBadge],
    ['MISSED', 'orange', PLAN_RUN_STATUS_CELL_COPY.missedBadge],
    ['QUEUED', 'default', PLAN_RUN_STATUS_CELL_COPY.queuedBadge],
    ['SCHEDULED', 'sky', PLAN_RUN_STATUS_CELL_COPY.scheduledBadge],
    ['SKIPPED', 'slate', PLAN_RUN_STATUS_CELL_COPY.skippedBadge],
    ['STALE', 'red', PLAN_RUN_STATUS_CELL_COPY.staleBadge],
    ['SUPERSEDED', 'slate', PLAN_RUN_STATUS_CELL_COPY.supersededBadge],
    ['USAGE_LIMITED', 'amber', PLAN_RUN_STATUS_CELL_COPY.usageLimitedBadge],
  ])('maps %s to %s "%s"', (status, color, label) => {
    expect(getPlanRunStatusBadgeVariant(status)).toEqual({ color, label });
  });

  test('falls back to the raw value in a neutral badge for an unknown status', () => {
    expect(getPlanRunStatusBadgeVariant('PAUSED_FOR_REVIEW')).toEqual({
      color: 'default',
      label: 'PAUSED_FOR_REVIEW',
    });
  });
});
