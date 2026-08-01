import * as React from 'react';
import { Menubar as MenubarPrimitive } from 'radix-ui';
import { Circle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface MenubarRadioItemProps extends React.ComponentPropsWithoutRef<
  typeof MenubarPrimitive.RadioItem
> {}

export const MenubarRadioItem = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.RadioItem>,
  MenubarRadioItemProps
>((props, ref): React.ReactElement => {
  const { className, children, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MenubarPrimitive.RadioItem
      className={cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      ref={ref}
      {...rest}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Circle aria-hidden="true" className="h-2 w-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
});

MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;
