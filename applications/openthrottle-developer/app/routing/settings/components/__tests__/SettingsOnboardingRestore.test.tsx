import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsOnboardingRestore } from '../SettingsOnboardingRestore';
import { DashboardGetStartedCard } from '~/routing/dashboard/components/DashboardGetStartedCard';
import {
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_STATE_VERSION,
} from '~/routing/dashboard/data/atom.onboarding';
import { GET_STARTED_RESTORE_COPY } from '~/routing/dashboard/data/data.copy';
import {
  ONBOARDING_STEP_ID,
  type OnboardingCompletion,
} from '~/routing/dashboard/utils/onboarding-steps';

const INCOMPLETE: OnboardingCompletion = {
  [ONBOARDING_STEP_ID.agentCli]: false,
  [ONBOARDING_STEP_ID.firstPlan]: false,
  [ONBOARDING_STEP_ID.firstRun]: false,
  [ONBOARDING_STEP_ID.githubToken]: false,
  [ONBOARDING_STEP_ID.workspaceRepo]: false,
};

const seedDismissed = (): void => {
  localStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify({ dismissed: true, version: ONBOARDING_STATE_VERSION }),
  );
};

// Fresh Jotai Provider per render so the persisted atom does not leak; children
// share one store so the restore control and the card react to the same state.
const renderWithProvider = (node: React.ReactNode): RenderResult => {
  const Component = () => <Provider>{node}</Provider>;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('SettingsOnboardingRestore Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('disables the button while the checklist is not dismissed', () => {
    const component = renderWithProvider(<SettingsOnboardingRestore />);

    expect(
      component.getByRole('button', { name: GET_STARTED_RESTORE_COPY.action }),
    ).toBeDisabled();
    expect(
      component.getByText(GET_STARTED_RESTORE_COPY.visibleNote),
    ).toBeInTheDocument();
  });

  test('enables the button once the checklist has been dismissed', () => {
    seedDismissed();
    const component = renderWithProvider(<SettingsOnboardingRestore />);

    expect(
      component.getByRole('button', { name: GET_STARTED_RESTORE_COPY.action }),
    ).toBeEnabled();
    expect(
      component.getByText(GET_STARTED_RESTORE_COPY.hiddenNote),
    ).toBeInTheDocument();
  });

  test('restoring makes the dismissed checklist visible again', async () => {
    const user = userEvent.setup();
    seedDismissed();
    const component = renderWithProvider(
      <>
        <DashboardGetStartedCard completion={INCOMPLETE} />
        <SettingsOnboardingRestore />
      </>,
    );

    // Dismissed → card hidden, restore offered.
    expect(
      component.queryByTestId('DashboardGetStartedCard'),
    ).not.toBeInTheDocument();

    await user.click(
      component.getByRole('button', { name: GET_STARTED_RESTORE_COPY.action }),
    );

    // Same store → the card comes back the moment dismissal is reset.
    expect(
      component.getByTestId('DashboardGetStartedCard'),
    ).toBeInTheDocument();
  });
});
