import * as React from 'react';
import { Menubar as MenubarPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface MenubarItemProps extends React.ComponentPropsWithoutRef<
  typeof MenubarPrimitive.Item
> {
  inset?: boolean;
}

export const MenubarItem = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Item>,
  MenubarItemProps
>((props, ref): React.ReactElement => {
  const { className, inset = false, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MenubarPrimitive.Item
      className={cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});

MenubarItem.displayName = MenubarPrimitive.Item.displayName;
