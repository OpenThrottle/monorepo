import * as React from 'react';
import { cn } from '../../utils/cn';

export type SidebarContentProps = React.ComponentProps<'div'>;

export function SidebarContent(props: SidebarContentProps) {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        className,
      )}
      data-sidebar="content"
      data-slot="sidebar-content"
      {...rest}
    />
  );
}
