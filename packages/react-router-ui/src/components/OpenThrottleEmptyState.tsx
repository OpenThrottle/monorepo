import * as React from 'react';
import classnames from 'classnames';
import { ARTWORK_YODA } from '../data/data.artwork';

export interface OpenThrottleEmptyStateProps {
  readonly className?: string;
  readonly description: string;
  readonly title: string;
}

export const OpenThrottleEmptyState = (props: OpenThrottleEmptyStateProps) => {
  const { className, description, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="OpenThrottleEmptyState"
    >
      <h2 className="text-base text-foreground mb-4">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="w-full flex">
        <pre className="text-[6px] md:text-xs text-muted-foreground/50 my-8 mx-auto">
          {ARTWORK_YODA}
        </pre>
      </div>
    </div>
  );
};
