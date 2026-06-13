import * as React from 'react';
import { cn } from '../../utils/cn';
import { Separator } from '../Separator';

export type SidebarSeparatorProps = React.ComponentProps<typeof Separator>;

export function SidebarSeparator(props: SidebarSeparatorProps) {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Separator
      className={cn('bg-sidebar-border mx-2 w-auto', className)}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      {...rest}
    />
  );
}
