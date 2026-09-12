import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface OpenThrottleTabLinkProps {
  className?: string;
}

export const OpenThrottleTabLink = (
  props: OpenThrottleTabLinkProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="OpenThrottleTabLink">
      <h2>OpenThrottleTabLink</h2>
    </div>
  );
};
