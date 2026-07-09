'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';
import { Skeleton } from '../Skeleton';

export type SidebarMenuSkeletonProps = React.ComponentProps<'div'> & {
  readonly showIcon?: boolean;
};

export function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: SidebarMenuSkeletonProps) {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  const skeletonStyle: React.CSSProperties & Record<`--${string}`, string> = {
    '--skeleton-width': width,
  };

  return (
    <div
      className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={skeletonStyle}
      />
    </div>
  );
}
