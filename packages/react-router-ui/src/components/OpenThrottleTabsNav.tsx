import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';

export interface OpenThrottleTabsNavProps {
  className?: string;
}

export const OpenThrottleTabsNav = (
  props: OpenThrottleTabsNavProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="OpenThrottleTabsNav">
      <h2>OpenThrottleTabsNav</h2>
    </div>
  );
};
