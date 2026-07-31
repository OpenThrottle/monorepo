'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '../../utils/cn';

export interface DrawerOverlayProps extends React.ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Overlay
> {}

export const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  DrawerOverlayProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DrawerPrimitive.Overlay
      className={cn(
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      data-slot="drawer-overlay"
      ref={ref}
      {...rest}
    />
  );
});

DrawerOverlay.displayName = 'DrawerOverlay';
