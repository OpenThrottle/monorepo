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
      screen.getByText(/these are the gaps that remain/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No per-prompt or per-command invocation counts/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Skill invocations are captured at the harness/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/opt-in enrichment for skills we author/i),
    ).toBeInTheDocument();
  });

  test('no longer claims latency/outcome metrics are missing or references Phase 4', () => {
    renderRoutesStub(<UsageAnalyticsGaps />);

    expect(screen.queryByText(/Phase 4/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/No latency or outcome metrics yet/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/\.cursor\/skills/i)).not.toBeInTheDocument();
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
