import * as React from 'react';
import { CommandItem as CmdkCommandItem } from 'cmdk';
import { cn } from '../../utils/cn';

export interface CommandItemProps extends React.ComponentPropsWithoutRef<
  typeof CmdkCommandItem
> {}

export const CommandItem = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandItem>,
  CommandItemProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CmdkCommandItem
      className={cn(
        'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
CommandItem.displayName = 'CommandItem';
