import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';

export interface OpenThrottleCalendarProps {
  className?: string;
}

export const OpenThrottleCalendar = (
  props: OpenThrottleCalendarProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="OpenThrottleCalendar">
      <h2>OpenThrottle Calendar</h2>
    </div>
  );
};
