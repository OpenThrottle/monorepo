import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  RolloutFlagKind,
  type RolloutFlagFieldsFragment,
} from '~/__generated__/graphql';
import { GLOBAL_POPOVER_COPY } from '@openthrottle/react-router-ui-global';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagsTable } from '../RolloutFlagsTable';
import type { RolloutFlagsTableProps } from '../RolloutFlagsTable';

const flags: RolloutFlagFieldsFragment[] = [
  {
    createdAt: '2026-07-24T00:00:00.000Z',
    description: null,
    enabled: true,
    fallthrough: { variations: [{ variation: 1, weight: 100 }] },
    id: 'flag-1',
    key: 'new-dashboard',
    kind: RolloutFlagKind.Boolean,
    offVariation: 0,
    targetRoles: [],
    updatedAt: '2026-07-24T00:00:00.000Z',
    variations: [
      { description: null, name: null, valueJson: 'false' },
      { description: null, name: null, valueJson: 'true' },
    ],
  },
  {
    createdAt: '2026-07-24T00:00:00.000Z',
    description: 'Admin billing',
    enabled: false,
    fallthrough: { variations: [{ variation: 1, weight: 100 }] },
    id: 'flag-2',
    key: 'billing',
    kind: RolloutFlagKind.Boolean,
    offVariation: 0,
    targetRoles: ['admin'],
    updatedAt: '2026-07-24T00:00:00.000Z',
    variations: [
      { description: null, name: null, valueJson: 'false' },
      { description: null, name: null, valueJson: 'true' },
    ],
  },
];

const renderTable = (props: RolloutFlagsTableProps): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: () => <RolloutFlagsTable {...props} />, path: '/' },
  ]);
  return render(<RoutesStub initialEntries={['/']} />);
};

describe('RolloutFlagsTable Component', () => {
  test('renders a row per flag with key links, kind, and allocation', () => {
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
    expect(component.getAllByText('boolean').length).toBeGreaterThan(0);
    expect(component.getAllByText('true 100%').length).toBeGreaterThan(0);
  });

  test('renders the shared Actions header and a per-row actions trigger', () => {
    const component = renderTable({ flags });

    expect(
      component.getByRole('columnheader', {
        name: GLOBAL_POPOVER_COPY.actionsHeader,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', {
        name: `${ROLLOUT_COPY.menuAriaLabelPrefix} new-dashboard`,
      }),
    ).toBeInTheDocument();
  });

  test('shows the empty state with no flags', () => {
    const component = renderTable({ flags: [] });
    expect(component.getByText(ROLLOUT_COPY.emptyState)).toBeInTheDocument();
  });
});
