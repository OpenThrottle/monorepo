import * as React from 'react';
import { CalendarDaysIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SCHEDULE_INTRO_COPY } from '~/routing/schedule/data/data.copy';

export interface ScheduleIntroductionProps {}

export const ScheduleIntroduction = (
  _props: ScheduleIntroductionProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="ScheduleIntroduction">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={CalendarDaysIcon}
        title={SCHEDULE_INTRO_COPY.title}
      />
      <p className="text-muted-foreground text-sm">
        {SCHEDULE_INTRO_COPY.description}
      </p>
    </div>
  );
};
