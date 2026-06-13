import * as React from 'react';
import classnames from 'classnames';
import { LucideIcon } from 'lucide-react';

export interface OpenThrottleFieldsetProps extends React.PropsWithChildren {
  className?: string;
  icon?: LucideIcon;
  id: string;
  legend: string;
}

export const OpenThrottleFieldset = (
  props: OpenThrottleFieldsetProps,
): React.ReactElement => {
  const { className, children, icon, id, legend } = props;

  // Hooks

  // Setup
  const Icon = icon;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <fieldset
      aria-labelledby={id}
      className={classnames(
        '--bg-card border-border rounded-md border transition-colors',
        'space-y-4 p-4 md:p-8',
        className,
      )}
      data-testid="OpenThrottleFieldset"
    >
      <legend
        className="text-foreground mb-0 flex items-center gap-2 px-1 text-base font-medium"
        id={id}
      >
        {Icon ? <Icon className="size-4" /> : null}
        {legend}
      </legend>

      {children}
    </fieldset>
  );
};
