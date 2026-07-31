import * as React from 'react';
import { CommandEmpty as CmdkCommandEmpty } from 'cmdk';

export interface CommandEmptyProps extends React.ComponentPropsWithoutRef<
  typeof CmdkCommandEmpty
> {}

export const CommandEmpty = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandEmpty>,
  CommandEmptyProps
>((props, ref): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CmdkCommandEmpty
      className="py-6 text-center text-sm"
      ref={ref}
      {...props}
    />
  );
});
CommandEmpty.displayName = 'CommandEmpty';
