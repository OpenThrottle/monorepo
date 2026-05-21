import * as React from 'react';
import { cn } from '../../utils/cn';

export type SidebarGroupContentProps = React.ComponentProps<'div'>;

export function SidebarGroupContent(props: SidebarGroupContentProps) {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('w-full text-sm', className)}
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      {...rest}
    />
  );
}
