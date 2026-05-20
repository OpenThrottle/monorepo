'use client';

import * as React from 'react';
import { Slot } from 'radix-ui';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '../../utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip';
import { sidebarMenuButtonVariants } from './sidebarMenuButtonVariants';
import { useSidebar } from './useSidebar';

export type SidebarMenuButtonProps = React.ComponentProps<'button'> & {
  readonly asChild?: boolean;
  readonly isActive?: boolean;
  readonly tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>;

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      className={cn(sidebarMenuButtonVariants({ size, variant }), className)}
      data-active={isActive}
      data-sidebar="menu-button"
      data-size={size}
      data-slot="sidebar-menu-button"
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  const tooltipProps =
    typeof tooltip === 'string'
      ? {
          children: tooltip,
        }
      : tooltip;

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>{button}</TooltipTrigger>
      <TooltipContent
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        side="right"
        {...tooltipProps}
      />
    </Tooltip>
  );
}
