import { screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { UsageOverview } from '../UsageOverview';

describe('UsageOverview Component', () => {
  test('renders overview heading and range explanation', () => {
    renderRoutesStub(<UsageOverview rangeDays={30} />);

    expect(
      screen.getByRole('heading', {
        name: 'Agents & OpenThrottle usage',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/last 30 days/i)).toBeInTheDocument();
    expect(
      screen.getByText(/per-prompt billing is still not tracked/i),
    ).toBeInTheDocument();
  });

  test('links to the usage sub-pages', () => {
    renderRoutesStub(<UsageOverview rangeDays={30} />);

    expect(screen.getByRole('link', { name: 'Agents usage' })).toHaveAttribute(
      'href',
      '/usage/agents',
    );
    expect(screen.getByRole('link', { name: 'Skills usage' })).toHaveAttribute(
      'href',
      '/usage/skills',
    );
    expect(screen.getByRole('link', { name: 'Telemetry' })).toHaveAttribute(
      'href',
      '/usage/telemetry',
    );
  });
});
