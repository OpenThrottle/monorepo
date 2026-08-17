import * as React from 'react';
import { CalendarClockIcon } from 'lucide-react';
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
      <div className="mb-4 flex items-center justify-between">
        <GlobalHeading
          heading="h1"
          icon={CalendarClockIcon}
          title={SCHEDULE_COPY.pageTitle}
        />
        <GlobalFeatureOnboardingTrigger />
      </div>
      <p className="text-muted-foreground text-sm">
        {SCHEDULE_COPY.pageDescription}
      </p>
    </div>
  );
};
