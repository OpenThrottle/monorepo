import * as React from 'react';
import { cn } from '../../utils/cn';

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
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
          'flex flex-col space-y-1.5 text-center sm:text-left',
          className,
        )}
        ref={ref}
        {...rest}
      />
    );
  },
);

DialogHeader.displayName = 'DialogHeader';
