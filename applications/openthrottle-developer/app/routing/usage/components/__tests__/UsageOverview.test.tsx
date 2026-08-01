import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { UsageOverview } from '../UsageOverview';
import { renderRoutesStub } from '~/testing/route-fixtures';

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

  test('links to prompts and skills surfaces', () => {
    renderRoutesStub(<UsageOverview rangeDays={30} />);

    expect(screen.getByRole('link', { name: 'Prompts' })).toHaveAttribute(
      'href',
      '/prompts',
    );
    expect(
      screen.getByRole('link', { name: 'Agents-type prompts' }),
    ).toHaveAttribute('href', '/prompts?type=AGENTS');
    expect(
      screen.getByRole('link', { name: 'Skills-type prompts' }),
    ).toHaveAttribute('href', '/prompts?type=SKILLS');
    expect(
      screen.getByRole('link', { name: 'Repo skill paths' }),
    ).toHaveAttribute('href', '/skills');
  });
});
