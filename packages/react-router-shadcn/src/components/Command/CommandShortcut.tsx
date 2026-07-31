import * as React from 'react';
import { cn } from '../../utils/cn';
import { Kbd } from '../Kbd';

/**
 * @description Displays a keyboard shortcut next to a command item (e.g. ⌘K). Use inside CommandItem; typically with ml-auto.
 */
export interface CommandShortcutProps extends React.ComponentPropsWithoutRef<
  typeof Kbd
> {}

export const CommandShortcut = React.forwardRef<
  React.ComponentRef<typeof Kbd>,
  CommandShortcutProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Kbd
      className={cn('ml-auto size-3.5 shrink-0 opacity-50', className)}
      ref={ref}
      {...rest}
    />
  );
});
CommandShortcut.displayName = 'CommandShortcut';
