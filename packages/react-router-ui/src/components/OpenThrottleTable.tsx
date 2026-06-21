import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';

export interface OpenThrottleTableProps {
  className?: string;
}

export const OpenThrottleTable = (
  props: OpenThrottleTableProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="OpenThrottleTable">
      <h2>OpenThrottle Table</h2>
    </div>
  );
};
