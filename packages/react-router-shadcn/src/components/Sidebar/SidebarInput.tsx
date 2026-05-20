import * as React from 'react';

import { cn } from '../../utils/cn';
import { Input } from '../Input';

export type SidebarInputProps = React.ComponentProps<typeof Input>;

export function SidebarInput({ className, ...props }: SidebarInputProps) {
  return (
    <Input
      className={cn('h-8 w-full bg-background shadow-none', className)}
      data-sidebar="input"
      data-slot="sidebar-input"
      {...props}
    />
  );
}
