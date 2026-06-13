import * as React from 'react';

import { cn } from '../../utils/cn';
import { Input } from '../Input';

export type SidebarInputProps = React.ComponentProps<typeof Input>;

export function SidebarInput({ className, ...props }: SidebarInputProps) {
  return (
    <Input
      className={cn('bg-background h-8 w-full shadow-none', className)}
      data-sidebar="input"
      data-slot="sidebar-input"
      {...props}
    />
  );
}
