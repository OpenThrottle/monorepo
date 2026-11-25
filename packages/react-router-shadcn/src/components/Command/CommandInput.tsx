import { CommandInput as CmdkCommandInput } from 'cmdk';
import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CommandInputProps extends React.ComponentPropsWithoutRef<
  typeof CmdkCommandInput
> {}

export const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandInput>,
  CommandInputProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CmdkCommandInput
      className={cn(
        'bg-background border-border placeholder:text-muted-foreground flex w-full border-b px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
CommandInput.displayName = 'CommandInput';
