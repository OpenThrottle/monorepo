import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { UsageAnalyticsGaps } from '../UsageAnalyticsGaps';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('UsageAnalyticsGaps Component', () => {
  test('renders analytics gaps heading and limitation bullets', () => {
    renderRoutesStub(<UsageAnalyticsGaps />);

    expect(
      screen.getByRole('heading', {
        name: 'Analytics gaps (by design today)',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/coarse workload signal only/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /No per-prompt, per-skill, or per-command invocation counts/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Token and cost usage is captured/i),
    ).toBeInTheDocument();
  });

  test('links to Prompts and Skills for deeper debugging', () => {
    renderRoutesStub(<UsageAnalyticsGaps />);

    expect(screen.getByRole('link', { name: 'Prompts' })).toHaveAttribute(
      'href',
      '/prompts',
    );
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'href',
      '/skills',
    );
  });
});
