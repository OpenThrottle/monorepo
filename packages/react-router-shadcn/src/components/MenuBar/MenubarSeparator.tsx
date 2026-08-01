import * as React from 'react';
import { Menubar as MenubarPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface MenubarSeparatorProps extends React.ComponentPropsWithoutRef<
  typeof MenubarPrimitive.Separator
> {}

export const MenubarSeparator = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Separator>,
  MenubarSeparatorProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MenubarPrimitive.Separator
      className={cn('bg-muted -mx-1 my-1 h-px', className)}
      ref={ref}
      {...rest}
    />
  );
});

MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;
