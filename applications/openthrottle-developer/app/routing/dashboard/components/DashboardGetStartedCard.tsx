import * as React from 'react';
import { Button, Card } from '@openthrottle/react-router-shadcn';
import { XIcon } from 'lucide-react';
import { useAtom } from 'jotai';
import clsx from 'clsx';
import { DashboardGetStartedStep } from '~/routing/dashboard/components/DashboardGetStartedStep';
import { GET_STARTED_STEPS } from '~/routing/dashboard/data/get-started-steps';
import {
  GET_STARTED_CARD_COPY,
  GET_STARTED_STEP_COPY,
} from '~/routing/dashboard/data/data.copy';
import { onboardingStateAtom } from '~/routing/dashboard/data/atom.onboarding';
import {
  isOnboardingComplete,
  type OnboardingCompletion,
} from '~/routing/dashboard/utils/onboarding-steps';

export interface DashboardGetStartedCardProps {
  className?: string;
  completion: OnboardingCompletion;
}

/**
 * @description The dashboard "Get Started" onboarding checklist. Lists the
 * first-run steps with per-step completion derived from real state and a
 * deep-link CTA each. Dismissable (persisted per-browser via the versioned
 * `onboardingStateAtom`) and auto-hides once every step is complete — so a
 * fully-onboarded user never sees it, regardless of the dismiss preference.
 */
export const DashboardGetStartedCard = (
  props: DashboardGetStartedCardProps,
): React.ReactElement | null => {
  const { className, completion } = props;

  // Hooks
  const [onboarding, setOnboarding] = useAtom(onboardingStateAtom);

  // Setup
  const allComplete = isOnboardingComplete(completion);

  // Handlers
  const handleDismiss = React.useCallback((): void => {
    setOnboarding((prev) => ({ ...prev, dismissed: true }));
  }, [setOnboarding]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  // Hidden once every step is done (server-derived) or after a manual dismiss
  // (client-only). Both collapse the card to nothing — no phantom grid cell.
  if (allComplete || onboarding.dismissed) {
    return null;
  }

  return (
    <Card
      className={clsx('gap-3 p-4', className)}
      data-testid="DashboardGetStartedCard"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{GET_STARTED_CARD_COPY.title}</h2>
          <p className="text-muted-foreground text-xs">
            {GET_STARTED_CARD_COPY.description}
          </p>
        </div>
        <Button
          aria-label={GET_STARTED_CARD_COPY.dismissLabel}
          className="shrink-0"
          onClick={handleDismiss}
          size="xs"
          variant="ghost"
        >
          <XIcon className="h-4 w-4" />
          {GET_STARTED_CARD_COPY.dismiss}
        </Button>
      </div>

      <ul className="divide-border divide-y">
        {GET_STARTED_STEPS.map((step) => {
          const copy = GET_STARTED_STEP_COPY[step.id];
          return (
            <DashboardGetStartedStep
              complete={completion[step.id]}
              cta={copy.cta}
              description={copy.description}
              href={step.href}
              key={step.id}
              title={copy.title}
            />
          );
        })}
      </ul>
    </Card>
  );
};
