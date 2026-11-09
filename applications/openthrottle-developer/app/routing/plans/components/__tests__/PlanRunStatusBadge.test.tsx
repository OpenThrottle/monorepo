import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

import { PlanRunStatusBadge } from '../PlanRunStatusBadge';

describe('PlanRunStatusBadge Component', () => {
  test.each([
    ['CANCELLED', PLAN_RUN_STATUS_CELL_COPY.cancelledBadge],
    ['COMPLETED', PLAN_RUN_STATUS_CELL_COPY.completedBadge],
    ['FAILED', PLAN_RUN_STATUS_CELL_COPY.failedBadge],
    ['IN_PROGRESS', PLAN_RUN_STATUS_CELL_COPY.inProgressBadge],
    ['MISSED', PLAN_RUN_STATUS_CELL_COPY.missedBadge],
    ['QUEUED', PLAN_RUN_STATUS_CELL_COPY.queuedBadge],
    ['SCHEDULED', PLAN_RUN_STATUS_CELL_COPY.scheduledBadge],
    ['SKIPPED', PLAN_RUN_STATUS_CELL_COPY.skippedBadge],
    ['STALE', PLAN_RUN_STATUS_CELL_COPY.staleBadge],
    ['SUPERSEDED', PLAN_RUN_STATUS_CELL_COPY.supersededBadge],
    ['USAGE_LIMITED', PLAN_RUN_STATUS_CELL_COPY.usageLimitedBadge],
  ])('badges %s as "%s"', (status, label) => {
    const component = render(<PlanRunStatusBadge status={status} />);

    const badge = component.getByTestId('PlanRunStatusBadge');
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveAttribute('data-status', status);
  });

  test('badges an unknown status with its raw value', () => {
    const component = render(<PlanRunStatusBadge status="PAUSED_FOR_REVIEW" />);

    expect(component.getByTestId('PlanRunStatusBadge')).toHaveTextContent(
      'PAUSED_FOR_REVIEW',
    );
  });
});
