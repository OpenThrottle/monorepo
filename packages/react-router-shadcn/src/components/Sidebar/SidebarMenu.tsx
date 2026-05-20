import * as React from 'react';

import { cn } from '../../utils/cn';

export type SidebarMenuProps = React.ComponentProps<'ul'>;

export function SidebarMenu(props: SidebarMenuProps) {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ul
      className={cn('flex w-full min-w-0 flex-col gap-1', className)}
      data-sidebar="menu"
      data-slot="sidebar-menu"
      {...rest}
    />
  );
}
