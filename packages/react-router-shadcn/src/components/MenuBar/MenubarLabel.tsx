import * as React from 'react';
import { Menubar as MenubarPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface MenubarLabelProps extends React.ComponentPropsWithoutRef<
  typeof MenubarPrimitive.Label
> {
  inset?: boolean;
}

export const MenubarLabel = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Label>,
  MenubarLabelProps
>((props, ref): React.ReactElement => {
  const { className, inset = false, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MenubarPrimitive.Label
      className={cn(
        'px-2 py-1.5 text-sm font-semibold',
        inset && 'pl-8',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});

MenubarLabel.displayName = MenubarPrimitive.Label.displayName;
