import * as React from 'react';

import { cn } from '../../utils/cn';
import { Separator } from '../Separator';

export type SidebarSeparatorProps = React.ComponentProps<typeof Separator>;

export function SidebarSeparator({
  className,
  ...props
}: SidebarSeparatorProps) {
  return (
    <Separator
      className={cn('mx-2 w-auto bg-sidebar-border', className)}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      {...props}
    />
  );
}
