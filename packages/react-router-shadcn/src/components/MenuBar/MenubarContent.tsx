import * as React from 'react';
import { Menubar as MenubarPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface MenubarContentProps extends React.ComponentPropsWithoutRef<
  typeof MenubarPrimitive.Content
> {}

export const MenubarContent = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Content>,
  MenubarContentProps
>((props, ref): React.ReactElement => {
  const {
    className,
    align = 'start',
    alignOffset = -4,
    sideOffset = 8,
    ...rest
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        align={align}
        alignOffset={alignOffset}
        className={cn(
          'bg-popover text-popover-foreground z-50 min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        ref={ref}
        sideOffset={sideOffset}
        {...rest}
      />
    </MenubarPrimitive.Portal>
  );
});

MenubarContent.displayName = MenubarPrimitive.Content.displayName;
