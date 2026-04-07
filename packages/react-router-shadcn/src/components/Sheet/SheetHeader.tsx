import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SheetHeader = (props: SheetHeaderProps): React.ReactElement => {
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

SheetHeader.displayName = 'SheetHeader';
