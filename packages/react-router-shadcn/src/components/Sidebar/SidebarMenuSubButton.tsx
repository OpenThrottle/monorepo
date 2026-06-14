import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from '../../utils/cn';

export type SidebarMenuSubButtonProps = React.ComponentProps<'a'> & {
  readonly asChild?: boolean;
  readonly isActive?: boolean;
  readonly size?: 'sm' | 'md';
};

export function SidebarMenuSubButton(props: SidebarMenuSubButtonProps) {
  const {
    asChild = false,
    size = 'md',
    isActive = false,
    className,
    ...rest
  } = props;

  // Hooks

  // Setup
  const Comp = asChild ? Slot.Root : 'a';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Comp
      className={cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      data-active={isActive}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-slot="sidebar-menu-sub-button"
      {...rest}
    />
  );
}
