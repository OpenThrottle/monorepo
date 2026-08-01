'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '../../utils/cn';

export interface DrawerDescriptionProps extends React.ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Description
> {}

export const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  DrawerDescriptionProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DrawerPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="drawer-description"
      ref={ref}
      {...rest}
    />
  );
});

DrawerDescription.displayName = 'DrawerDescription';
