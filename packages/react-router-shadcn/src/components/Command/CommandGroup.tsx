import { CommandGroup as CmdkCommandGroup } from 'cmdk';
import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CommandGroupProps extends React.ComponentPropsWithoutRef<
  typeof CmdkCommandGroup
> {}

export const CommandGroup = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandGroup>,
  CommandGroupProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CmdkCommandGroup
      className={cn(
        'text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
CommandGroup.displayName = 'CommandGroup';
