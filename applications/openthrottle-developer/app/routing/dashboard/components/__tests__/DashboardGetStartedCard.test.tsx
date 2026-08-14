import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardGetStartedCard } from '../DashboardGetStartedCard';
import { GET_STARTED_CARD_COPY } from '~/routing/dashboard/data/data.copy';
import {
  ONBOARDING_STEP_ID,
  type OnboardingCompletion,
} from '~/routing/dashboard/utils/onboarding-steps';

const completion = (
  overrides: Partial<OnboardingCompletion> = {},
): OnboardingCompletion => ({
  [ONBOARDING_STEP_ID.agentCli]: false,
  [ONBOARDING_STEP_ID.firstPlan]: false,
  [ONBOARDING_STEP_ID.firstRun]: false,
  [ONBOARDING_STEP_ID.githubToken]: false,
  [ONBOARDING_STEP_ID.workspaceRepo]: false,
  ...overrides,
});

const ALL_COMPLETE: OnboardingCompletion = {
  [ONBOARDING_STEP_ID.agentCli]: true,
  [ONBOARDING_STEP_ID.firstPlan]: true,
  [ONBOARDING_STEP_ID.firstRun]: true,
  [ONBOARDING_STEP_ID.githubToken]: true,
  [ONBOARDING_STEP_ID.workspaceRepo]: true,
};

// Fresh Jotai Provider per render so the persisted onboarding atom does not leak
// across tests; localStorage is cleared in beforeEach for the same reason.
const renderCard = (props: {
  completion: OnboardingCompletion;
}): RenderResult => {
  const Component = () => (
    <Provider>
      <DashboardGetStartedCard {...props} />
    </Provider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('DashboardGetStartedCard Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders every checklist step when incomplete and not dismissed', () => {
    const component = renderCard({ completion: completion() });

    expect(
      component.getByTestId('DashboardGetStartedCard'),
    ).toBeInTheDocument();
    expect(component.getAllByTestId('DashboardGetStartedStep')).toHaveLength(5);
  });

  test('reflects completion — done steps drop their CTA, pending steps keep it', () => {
    const component = renderCard({
      completion: completion({ [ONBOARDING_STEP_ID.githubToken]: true }),
    });

    const steps = component.getAllByTestId('DashboardGetStartedStep');
    const done = steps.filter(
      (step) => step.getAttribute('data-complete') === 'true',
    );
    expect(done).toHaveLength(1);
    // 5 steps, 1 complete → 4 remaining CTA links.
    expect(component.getAllByRole('link')).toHaveLength(4);
  });

  test('dismiss hides the card and it stays hidden on re-render (persisted)', async () => {
    const user = userEvent.setup();
    const component = renderCard({ completion: completion() });

    await user.click(
      component.getByRole('button', {
        name: GET_STARTED_CARD_COPY.dismissLabel,
      }),
    );

    expect(
      component.queryByTestId('DashboardGetStartedCard'),
    ).not.toBeInTheDocument();

    // A fresh Provider re-reads the persisted atom from localStorage — the card
    // remains hidden without any in-memory state carrying over.
    const remount = renderCard({ completion: completion() });
    expect(
      remount.queryByTestId('DashboardGetStartedCard'),
    ).not.toBeInTheDocument();
  });

  test('auto-hides when every step is complete, regardless of dismiss', () => {
    const component = renderCard({ completion: ALL_COMPLETE });

    expect(
      component.queryByTestId('DashboardGetStartedCard'),
    ).not.toBeInTheDocument();
  });
});
