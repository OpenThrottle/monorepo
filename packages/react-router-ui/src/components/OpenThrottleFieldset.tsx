import * as React from 'react';
import classnames from 'classnames';

export interface OpenThrottleFieldsetProps extends React.PropsWithChildren {
  className?: string;
  legend: string;
  id: string;
}

export const OpenThrottleFieldset = (props: OpenThrottleFieldsetProps) => {
  const { className, children, id, legend } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <fieldset
      aria-labelledby={id}
      className={classnames(
        'bg-card border border-border rounded-md space-y-4 p-4 transition-colors',
        className,
      )}
      data-testid="OpenThrottleFieldset"
    >
      <legend
        className="px-1 mb-0 text-base font-medium text-foreground"
        id={id}
      >
        {legend}
      </legend>

      {children}
    </fieldset>
  );
};
