import * as React from 'react';
import { Menubar as MenubarPrimitive } from 'radix-ui';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface MenubarSubTriggerProps extends React.ComponentPropsWithoutRef<
  typeof MenubarPrimitive.SubTrigger
> {
  inset?: boolean;
}

export const MenubarSubTrigger = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.SubTrigger>,
  MenubarSubTriggerProps
>((props, ref): React.ReactElement => {
  const { className, inset = false, children, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MenubarPrimitive.SubTrigger
      className={cn(
        'focus:bg-accent data-[state=open]:bg-accent flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none',
        inset && 'pl-8',
        className,
      )}
      ref={ref}
      {...rest}
    >
      {children}
      <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4" />
    </MenubarPrimitive.SubTrigger>
  );
});

MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;
