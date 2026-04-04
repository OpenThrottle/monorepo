import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TabsTriggerProps {
  readonly className?: string;
}

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      ref={ref}
      role="tab"
      type="button"
      {...rest}
    />
  );
});

TabsTrigger.displayName = 'TabsTrigger';
