import * as React from 'react';
import { cn } from '../../utils/cn';

export interface DropdownMenuShortcutProps extends React.ComponentProps<'span'> {}

export const DropdownMenuShortcut = React.forwardRef<
  HTMLSpanElement,
  DropdownMenuShortcutProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      ref={ref}
      {...rest}
    />
  );
});

DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';
