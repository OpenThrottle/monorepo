import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { PlanManagedTaskBadge } from '../PlanManagedTaskBadge';
import { MANAGED_TASK_BADGE_COPY } from '~/routing/plans/data/data.copy';
import { renderWithProviders } from '~/testing/route-fixtures';

describe('PlanManagedTaskBadge Component', () => {
  test('renders the managed label with an accessible name', () => {
    const component = renderWithProviders(<PlanManagedTaskBadge />);

    const badge = component.getByTestId('PlanManagedTaskBadge');
    expect(badge).toHaveTextContent(MANAGED_TASK_BADGE_COPY.label);
    expect(badge).toHaveAttribute('aria-label', MANAGED_TASK_BADGE_COPY.label);
  });
});
