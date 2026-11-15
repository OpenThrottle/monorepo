import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { UsageOverview } from '../UsageOverview';

describe('UsageOverview Component', () => {
  test('renders overview heading and range explanation', () => {
    const component = renderRoutesStub(<UsageOverview rangeDays={30} />);

    expect(
      component.getByRole('heading', {
        name: 'Agents & OpenThrottle usage',
      }),
    ).toBeInTheDocument();
    expect(component.getByText(/last 30 days/i)).toBeInTheDocument();
    expect(
      component.getByText(/per-prompt billing is still not tracked/i),
    ).toBeInTheDocument();
  });

  test('links to the usage sub-pages', () => {
    const component = renderRoutesStub(<UsageOverview rangeDays={30} />);

    expect(
      component.getByRole('link', { name: 'Agents usage' }),
    ).toHaveAttribute('href', '/usage/agents');
    expect(
      component.getByRole('link', { name: 'Skills usage' }),
    ).toHaveAttribute('href', '/usage/skills');
    expect(component.getByRole('link', { name: 'Telemetry' })).toHaveAttribute(
      'href',
      '/usage/telemetry',
    );
  });
});
