import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';

export interface OpenThrottleSidebarProps {
  readonly className?: string;
}

export const OpenThrottleSidebar = (
  props: OpenThrottleSidebarProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="OpenThrottleSidebar">
      <h2>OpenThrottle Sidebar</h2>
    </div>
  );
};
