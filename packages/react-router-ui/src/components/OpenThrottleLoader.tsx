import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface OpenThrottleLoaderProps {
  readonly className?: string;
}

export const OpenThrottleLoader = (
  props: OpenThrottleLoaderProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="OpenThrottleLoader">
      <h2>OpenThrottle Loader</h2>
    </div>
  );
};
