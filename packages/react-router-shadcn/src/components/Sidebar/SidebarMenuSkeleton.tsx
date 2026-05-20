import * as React from 'react';
import classnames from 'classnames';

export interface SidebarMenuSkeletonProps {
  readonly className?: string;
}

export const SidebarMenuSkeleton = (
  props: SidebarMenuSkeletonProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="SidebarMenuSkeleton"
    >
      <h2>SidebarMenuSkeleton</h2>
    </div>
  );
};
