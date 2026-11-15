import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { UsageAnalyticsGaps } from '../UsageAnalyticsGaps';

describe('UsageAnalyticsGaps Component', () => {
  test('renders analytics gaps heading and limitation bullets', () => {
    const component = renderRoutesStub(<UsageAnalyticsGaps />);

    expect(
      component.getByRole('heading', {
        name: 'Analytics gaps (by design today)',
      }),
    ).toBeInTheDocument();
    expect(
      component.getByText(/these are the gaps that remain/i),
    ).toBeInTheDocument();
    expect(
      component.getByText(/No per-prompt or per-command invocation counts/i),
    ).toBeInTheDocument();
    expect(
      component.getByText(/Skill invocations are captured at the harness/i),
    ).toBeInTheDocument();
    expect(
      component.getByText(/opt-in enrichment for skills we author/i),
    ).toBeInTheDocument();
  });

  test('no longer claims latency/outcome metrics are missing or references Phase 4', () => {
    const component = renderRoutesStub(<UsageAnalyticsGaps />);

    expect(component.queryByText(/Phase 4/i)).not.toBeInTheDocument();
    expect(
      component.queryByText(/No latency or outcome metrics yet/i),
    ).not.toBeInTheDocument();
    expect(component.queryByText(/\.cursor\/skills/i)).not.toBeInTheDocument();
  });

  test('links to Prompts and Skills for deeper debugging', () => {
    const component = renderRoutesStub(<UsageAnalyticsGaps />);

    expect(component.getByRole('link', { name: 'Prompts' })).toHaveAttribute(
      'href',
      '/prompts',
    );
    expect(component.getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'href',
      '/skills',
    );
  });
});
