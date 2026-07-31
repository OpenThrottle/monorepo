import * as React from 'react';
import { Command as CmdkCommand } from 'cmdk';
import { cn } from '../../utils/cn';

export interface CommandProps extends React.ComponentPropsWithoutRef<
  typeof CmdkCommand
> {}

export const Command = React.forwardRef<
  React.ComponentRef<typeof CmdkCommand>,
  CommandProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CmdkCommand
      className={cn(
        'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
Command.displayName = 'Command';
