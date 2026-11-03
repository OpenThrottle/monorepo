import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

import { PlanRunStatusBadge } from '../PlanRunStatusBadge';

describe('PlanRunStatusBadge Component', () => {
  test.each([
    ['MISSED', PLAN_RUN_STATUS_CELL_COPY.missedBadge],
    ['SCHEDULED', PLAN_RUN_STATUS_CELL_COPY.scheduledBadge],
    ['SUPERSEDED', PLAN_RUN_STATUS_CELL_COPY.supersededBadge],
    ['USAGE_LIMITED', PLAN_RUN_STATUS_CELL_COPY.usageLimitedBadge],
  ])('badges %s as "%s"', (status, label) => {
    const component = render(<PlanRunStatusBadge status={status} />);

    expect(component.getByText(label)).toBeInTheDocument();
  });

  test('renders nothing for a status without a badge', () => {
    const component = render(<PlanRunStatusBadge status="COMPLETED" />);

    expect(component.queryByTestId('PlanRunStatusBadge')).toBeNull();
  });
});
