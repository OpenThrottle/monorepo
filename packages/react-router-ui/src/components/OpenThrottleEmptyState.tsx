import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';
import { ARTWORK_YODA } from '../data/data.artwork';

export interface OpenThrottleEmptyStateProps {
  readonly className?: string;
  readonly description: string;
  readonly title: string;
}

export const OpenThrottleEmptyState = (
  props: OpenThrottleEmptyStateProps,
): React.ReactElement => {
  const { className, description, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="OpenThrottleEmptyState">
      <h2 className="text-foreground mb-4 text-base">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>

      <div className="flex w-full">
        <pre className="text-muted-foreground/50 mx-auto my-8 text-[6px] md:text-xs">
          {ARTWORK_YODA}
        </pre>
      </div>
    </div>
  );
};
