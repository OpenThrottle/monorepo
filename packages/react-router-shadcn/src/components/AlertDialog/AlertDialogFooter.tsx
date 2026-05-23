import * as React from 'react';
import { cn } from '../../utils/cn';

export interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AlertDialogFooter = (
  props: AlertDialogFooterProps,
): React.ReactElement => {
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
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
        className,
      )}
      {...rest}
    />
  );
};

AlertDialogFooter.displayName = 'AlertDialogFooter';
