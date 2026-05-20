import * as React from 'react';
import { cn } from '../../utils/cn';

export type SidebarFooterProps = React.ComponentProps<'div'>;

export function SidebarFooter(props: SidebarFooterProps) {
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
      data-sidebar="footer"
      data-slot="sidebar-footer"
      {...rest}
    />
  );
}
