import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardGetStartedSection } from '../DashboardGetStartedSection';
import type { DashboardGetStartedSectionProps } from '../DashboardGetStartedSection';

const onboarding = (
  overrides: Partial<
    Awaited<DashboardGetStartedSectionProps['onboarding']>
  > = {},
): DashboardGetStartedSectionProps['onboarding'] =>
  Promise.resolve({
    discoverAgentClis: { totalCount: 0 },
    githubTokenConfigured: false,
    planCountsByStatus: [],
    workspaceLocalRepositories: [],
    ...overrides,
  });

const renderSection = (
  props: DashboardGetStartedSectionProps,
): RenderResult => {
  const Component = () => <DashboardGetStartedSection {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('DashboardGetStartedSection Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('streams the Get Started card in when steps are incomplete', async () => {
    const component = renderSection({ onboarding: onboarding() });

    expect(
      await component.findByTestId('DashboardGetStartedCard'),
    ).toBeInTheDocument();
  });

  test('renders nothing once every step is complete (auto-hide)', async () => {
    const component = renderSection({
      onboarding: onboarding({
        discoverAgentClis: { totalCount: 1 },
        githubTokenConfigured: true,
        planCountsByStatus: [{ count: 1, status: 'COMPLETED' }],
        workspaceLocalRepositories: [{ id: 'repo-1' }],
      }),
    });

    // Let the deferred boundary resolve, then assert the card never mounts.
    await Promise.resolve();
    expect(
      component.queryByTestId('DashboardGetStartedCard'),
    ).not.toBeInTheDocument();
  });
});
