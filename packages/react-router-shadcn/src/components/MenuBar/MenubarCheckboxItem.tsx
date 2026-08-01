import * as React from 'react';
import { Menubar as MenubarPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface MenubarCheckboxItemProps extends React.ComponentPropsWithoutRef<
  typeof MenubarPrimitive.CheckboxItem
> {}

export const MenubarCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.CheckboxItem>,
  MenubarCheckboxItemProps
>((props, ref): React.ReactElement => {
  const { className, children, checked, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MenubarPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      ref={ref}
      {...rest}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
});

MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;
