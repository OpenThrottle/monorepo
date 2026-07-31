import * as React from 'react';
import { cn } from '../../utils/cn';

export interface ContextMenuShortcutProps extends React.ComponentProps<'span'> {}

export const ContextMenuShortcut = React.forwardRef<
  HTMLSpanElement,
  ContextMenuShortcutProps
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

ContextMenuShortcut.displayName = 'ContextMenuShortcut';
