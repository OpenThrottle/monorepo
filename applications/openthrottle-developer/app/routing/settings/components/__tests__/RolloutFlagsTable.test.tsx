import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { RolloutFlagsTable } from '../RolloutFlagsTable';
import type { RolloutFlagsTableProps } from '../RolloutFlagsTable';

const flags: RolloutFlagFieldsFragment[] = [
  {
    createdAt: '2026-07-24T00:00:00.000Z',
    description: null,
    enabled: true,
    id: 'flag-1',
    key: 'new-dashboard',
    targetRoles: [],
    updatedAt: '2026-07-24T00:00:00.000Z',
  },
  {
    createdAt: '2026-07-24T00:00:00.000Z',
    description: 'Admin billing',
    enabled: false,
    id: 'flag-2',
    key: 'billing',
    targetRoles: ['admin'],
    updatedAt: '2026-07-24T00:00:00.000Z',
  },
];

const renderTable = (props: RolloutFlagsTableProps): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: () => <RolloutFlagsTable {...props} />, path: '/' },
  ]);
  return render(<RoutesStub initialEntries={['/']} />);
};

describe('RolloutFlagsTable Component', () => {
  test('renders a row per flag with key links and state', () => {
    const component = renderTable({ flags });

    const keyLink = component.getByRole('link', { name: 'new-dashboard' });
    expect(keyLink).toHaveAttribute('href', '/settings/rollout/flag-1');
    expect(component.getByRole('link', { name: 'billing' })).toHaveAttribute(
      'href',
      '/settings/rollout/flag-2',
    );
    // "Disabled" only appears as flag-2's state badge (the column header is "Enabled").
    expect(component.getByText('Disabled')).toBeInTheDocument();
    // Untargeted flag shows "Everyone"; targeted flag shows the role badge.
    expect(component.getByText('Everyone')).toBeInTheDocument();
    expect(component.getByText('admin')).toBeInTheDocument();
  });

  test('shows the empty state with no flags', () => {
    const component = renderTable({ flags: [] });
    expect(
      component.getByText('No feature flags yet. Create one to get started.'),
    ).toBeInTheDocument();
  });
});
