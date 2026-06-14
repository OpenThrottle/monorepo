import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from '../../utils/cn';

export type SidebarGroupActionProps = React.ComponentProps<'button'> & {
  readonly asChild?: boolean;
};

export function SidebarGroupAction(props: SidebarGroupActionProps) {
  const { asChild = false, className, ...rest } = props;

  // Hooks

  // Setup
  const Comp = asChild ? Slot.Root : 'button';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Comp
      className={cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'after:absolute after:-inset-2 md:after:hidden',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      data-sidebar="group-action"
      data-slot="sidebar-group-action"
      {...rest}
    />
  );
}
