'use client';

import * as React from 'react';
import { PanelLeftIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Button } from '../Button';
import { useSidebar } from './useSidebar';

export type SidebarTriggerProps = React.ComponentProps<typeof Button>;

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      className={cn('size-7', className)}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      size="icon"
      variant="ghost"
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
