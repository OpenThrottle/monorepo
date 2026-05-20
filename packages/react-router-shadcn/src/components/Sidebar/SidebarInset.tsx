import * as React from 'react';

import { cn } from '../../utils/cn';

export type SidebarInsetProps = React.ComponentProps<'main'>;

export function SidebarInset({ className, ...props }: SidebarInsetProps) {
  return (
    <main
      className={cn(
        'relative flex w-full flex-1 flex-col bg-background',
        'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
        className,
      )}
      data-slot="sidebar-inset"
      {...props}
    />
  );
}
