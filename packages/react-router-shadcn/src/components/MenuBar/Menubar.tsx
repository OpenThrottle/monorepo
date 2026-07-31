import * as React from 'react';
import { Menubar as MenubarPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface MenubarProps extends React.ComponentPropsWithoutRef<
  typeof MenubarPrimitive.Root
> {}

export const Menubar = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Root>,
  MenubarProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MenubarPrimitive.Root
      className={cn(
        'bg-background flex h-9 items-center space-x-1 rounded-md border p-1 shadow-sm',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});

Menubar.displayName = MenubarPrimitive.Root.displayName;
