import * as React from 'react';

import { cn } from '../../utils/cn';

export type SidebarHeaderProps = React.ComponentProps<'div'>;

export function SidebarHeader(props: SidebarHeaderProps) {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-2 p-2', className)}
      data-sidebar="header"
      data-slot="sidebar-header"
      {...rest}
    />
  );
}
