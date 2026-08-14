import * as React from 'react';
import { Await } from 'react-router';
import { DashboardGetStartedCard } from '~/routing/dashboard/components/DashboardGetStartedCard';
import { deriveOnboardingCompletion } from '~/routing/dashboard/utils/onboarding-steps';
import type { Route } from '@/app/routes/+types/dashboard._index';

type DashboardLoaderData = Route.ComponentProps['loaderData'];

export interface DashboardGetStartedSectionProps {
  onboarding: DashboardLoaderData['onboarding'];
}

/**
 * @description Deferred boundary for the dashboard Get Started checklist. A bare
 * Await (errorElement/fallback = null) so this non-critical nudge never blocks
 * the grid and leaves no phantom cell when hidden — pending, errored, dismissed,
 * or all-complete all resolve to no DOM node. Derives per-step completion from
 * the streamed onboarding signals and hands it to the card.
 */
export const DashboardGetStartedSection = (
  props: DashboardGetStartedSectionProps,
): React.ReactElement => {
  const { onboarding } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <React.Suspense fallback={null}>
      <Await errorElement={null} resolve={onboarding}>
        {(data) => (
          <DashboardGetStartedCard
            className="col-span-2"
            completion={deriveOnboardingCompletion(data)}
          />
        )}
      </Await>
    </React.Suspense>
  );
};
