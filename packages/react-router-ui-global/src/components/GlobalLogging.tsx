import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface GlobalLoggingProps {
  readonly className?: string;
}

export const GlobalLogging = (
  props: GlobalLoggingProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="GlobalLogging">
      <h2>GlobalLogging</h2>
    </div>
  );
};
