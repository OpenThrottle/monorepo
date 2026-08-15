import * as React from 'react';
import { Link } from 'react-router';
import { CalendarClockIcon } from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';

export interface ScheduleIntroductionProps {
  className?: string;
}

/**
 * @description Always-on header for the schedule index: title, one-line description,
 * and the "New schedule" CTA. Copy is single-sourced from {@link SCHEDULE_COPY}.
 * Distinct from the richer new-user `GlobalFeatureOnboarding` teaching block.
 */
export const ScheduleIntroduction = (
  props: ScheduleIntroductionProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="ScheduleIntroduction">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={CalendarClockIcon}
        title={SCHEDULE_COPY.pageTitle}
      >
        <GlobalFeatureOnboardingTrigger />
        <Button asChild={true} size="xs">
          <Link to="/schedule/create">{SCHEDULE_COPY.newScheduleAction}</Link>
        </Button>
      </GlobalHeading>
      <p className="text-muted-foreground text-sm">
        {SCHEDULE_COPY.pageDescription}
      </p>
    </div>
  );
};
