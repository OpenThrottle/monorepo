import * as React from 'react';
import { CalendarDaysIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { CALENDAR_INTRO_COPY } from '~/routing/calendar/data/data.copy';

export interface CalendarIntroductionProps {}

export const CalendarIntroduction = (
  _props: CalendarIntroductionProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="CalendarIntroduction">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={CalendarDaysIcon}
        title={CALENDAR_INTRO_COPY.title}
      />
      <p className="text-muted-foreground text-sm">
        {CALENDAR_INTRO_COPY.description}
      </p>
    </div>
  );
};
