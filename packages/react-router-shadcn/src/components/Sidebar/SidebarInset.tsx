import * as React from 'react';

import { cn } from '../../utils/cn';

export type SidebarInsetProps = React.ComponentProps<'main'>;

export function SidebarInset(props: SidebarInsetProps) {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main
      className={cn(
        'bg-background relative flex w-full flex-1 flex-col',
        'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
        className,
      )}
      data-slot="sidebar-inset"
      {...rest}
    />
  );
}
