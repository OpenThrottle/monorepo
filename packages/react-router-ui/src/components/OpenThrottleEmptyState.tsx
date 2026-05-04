import * as React from 'react';

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
    <div className={className} data-testid="OpenThrottleEmptyState">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
