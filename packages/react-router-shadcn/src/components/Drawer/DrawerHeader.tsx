'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface DrawerHeaderProps extends React.ComponentPropsWithoutRef<'div'> {}

export const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(
          'flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left',
          className,
        )}
        data-slot="drawer-header"
        ref={ref}
        {...rest}
      />
    );
  },
);

DrawerHeader.displayName = 'DrawerHeader';
