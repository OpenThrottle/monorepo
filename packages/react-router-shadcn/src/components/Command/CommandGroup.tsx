import * as React from 'react';
import { CommandGroup as CmdkCommandGroup } from 'cmdk';
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
        'text-foreground [&_[data-slot=command-group-heading]]:text-md [&_[data-slot=command-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group-heading]]:font-extrabold',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
CommandGroup.displayName = 'CommandGroup';
