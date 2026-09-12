import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface OpenThrottleNavigationProps {
  readonly className?: string;
}

export const OpenThrottleNavigation = (
  props: OpenThrottleNavigationProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="OpenThrottleNavigation">
      <h2>OpenThrottle Navigation</h2>
    </div>
  );
};
