import * as React from 'react';
import { CommandSeparator as CmdkCommandSeparator } from 'cmdk';
import { cn } from '../../utils/cn';

export interface CommandSeparatorProps extends React.ComponentPropsWithoutRef<
  typeof CmdkCommandSeparator
> {}

export const CommandSeparator = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandSeparator>,
  CommandSeparatorProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CmdkCommandSeparator
      className={cn('bg-border -mx-1 h-px', className)}
      ref={ref}
      {...rest}
    />
  );
});
CommandSeparator.displayName = 'CommandSeparator';
