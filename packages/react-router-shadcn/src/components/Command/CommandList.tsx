import * as React from 'react';
import { CommandList as CmdkCommandList } from 'cmdk';
import { cn } from '../../utils/cn';

export interface CommandListProps extends React.ComponentPropsWithoutRef<
  typeof CmdkCommandList
> {}

export const CommandList = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandList>,
  CommandListProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CmdkCommandList
      className={cn(
        'max-h-[300px] overflow-x-hidden overflow-y-auto',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
CommandList.displayName = 'CommandList';
