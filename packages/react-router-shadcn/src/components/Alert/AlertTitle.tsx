import * as React from 'react';

import { cn } from '../../utils/cn';

export interface AlertTitleProps extends React.ComponentProps<'div'> {}

export const AlertTitle = React.forwardRef<HTMLDivElement, AlertTitleProps>(
  (props, ref): React.ReactElement => {
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
          'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight',
          className,
        )}
        data-slot="alert-title"
        ref={ref}
        {...rest}
      />
    );
  },
);

AlertTitle.displayName = 'AlertTitle';
