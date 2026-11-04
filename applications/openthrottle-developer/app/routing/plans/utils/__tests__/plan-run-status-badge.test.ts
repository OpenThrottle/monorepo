import { describe, expect, test } from 'vitest';

import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

import { getPlanRunStatusBadgeVariant } from '../plan-run-status-badge';

describe('getPlanRunStatusBadgeVariant', () => {
  test('maps each badged status to its colour and label', () => {
    expect(getPlanRunStatusBadgeVariant('SCHEDULED')).toEqual({
      color: 'sky',
      label: PLAN_RUN_STATUS_CELL_COPY.scheduledBadge,
    });
    expect(getPlanRunStatusBadgeVariant('MISSED')).toEqual({
      color: 'orange',
      label: PLAN_RUN_STATUS_CELL_COPY.missedBadge,
    });
    expect(getPlanRunStatusBadgeVariant('SUPERSEDED')).toEqual({
      color: 'slate',
      label: PLAN_RUN_STATUS_CELL_COPY.supersededBadge,
    });
    expect(getPlanRunStatusBadgeVariant('USAGE_LIMITED')).toEqual({
      color: 'amber',
      label: PLAN_RUN_STATUS_CELL_COPY.usageLimitedBadge,
    });
  });

  test('returns null for an unbadged status', () => {
    expect(getPlanRunStatusBadgeVariant('COMPLETED')).toBeNull();
  });
});
