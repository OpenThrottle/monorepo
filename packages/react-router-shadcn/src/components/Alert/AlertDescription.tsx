import * as React from 'react';

import { cn } from '../../utils/cn';

export interface AlertDescriptionProps extends React.ComponentProps<'div'> {}

export const AlertDescription = React.forwardRef<
  HTMLDivElement,
  AlertDescriptionProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className,
      )}
      data-slot="alert-description"
      ref={ref}
      {...rest}
    />
  );
});

AlertDescription.displayName = 'AlertDescription';
