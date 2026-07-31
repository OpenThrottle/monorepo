'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '../../utils/cn';

export interface DrawerTitleProps extends React.ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Title
> {}

export const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  DrawerTitleProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DrawerPrimitive.Title
      className={cn('text-foreground font-semibold', className)}
      data-slot="drawer-title"
      ref={ref}
      {...rest}
    />
  );
});

DrawerTitle.displayName = 'DrawerTitle';
