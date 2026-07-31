import * as React from 'react';
import { cn } from '../../utils/cn';

export interface MenubarShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const MenubarShortcut = (
  props: MenubarShortcutProps,
): React.ReactElement => {
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
      {...rest}
    />
  );
};

MenubarShortcut.displayName = 'MenubarShortcut';
