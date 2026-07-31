import * as React from 'react';
import { cn } from '../../utils/cn';

export interface AlertDialogHeaderProps extends React.ComponentProps<'div'> {}

export const AlertDialogHeader = React.forwardRef<
  HTMLDivElement,
  AlertDialogHeaderProps
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
        'flex flex-col space-y-2 text-center sm:text-left',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});

AlertDialogHeader.displayName = 'AlertDialogHeader';
