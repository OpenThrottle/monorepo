import * as React from 'react';
import { CommandInput as CmdkCommandInput } from 'cmdk';
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
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex w-full rounded-md border text-sm focus:ring-2 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
CommandInput.displayName = 'CommandInput';
