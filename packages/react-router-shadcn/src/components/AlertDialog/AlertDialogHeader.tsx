import * as React from 'react';
import { cn } from '../../utils/cn';

export interface AlertDialogHeaderProps {
  readonly className?: string;
}

export const AlertDialogHeader = (
  props: React.HTMLAttributes<HTMLDivElement>,
) => {
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
      {...rest}
    />
  );
};

AlertDialogHeader.displayName = 'AlertDialogHeader';
