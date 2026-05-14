import * as React from 'react';
import { Kbd } from '../Kbd';
import { cn } from '../../utils/cn';

export interface CommandShortcutProps {
  readonly className?: string;
}

/**
 * @description Displays a keyboard shortcut next to a command item
 * (e.g. ⌘K). Use inside CommandItem; typically with ml-auto.
 */
export const CommandShortcut = React.forwardRef<
  React.ComponentRef<typeof Kbd>,
  React.ComponentPropsWithoutRef<typeof Kbd>
>((props, ref) => {
  const { className } = props;

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
      {...props}
    />
  );
});

CommandShortcut.displayName = 'CommandShortcut';
