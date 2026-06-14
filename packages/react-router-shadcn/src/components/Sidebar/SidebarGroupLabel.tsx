import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from '../../utils/cn';

export type SidebarGroupLabelProps = React.ComponentProps<'div'> & {
  readonly asChild?: boolean;
};

export function SidebarGroupLabel(props: SidebarGroupLabelProps) {
  const { className, asChild = false, ...rest } = props;

  // Hooks

  // Setup
  const Comp = asChild ? Slot.Root : 'div';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Comp
      className={cn(
        'text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      data-sidebar="group-label"
      data-slot="sidebar-group-label"
      {...rest}
    />
  );
}
