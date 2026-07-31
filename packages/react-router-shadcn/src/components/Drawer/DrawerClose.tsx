'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

export interface DrawerCloseProps extends React.ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Close
> {}

export const DrawerClose = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Close>,
  DrawerCloseProps
>((props, ref): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DrawerPrimitive.Close data-slot="drawer-close" ref={ref} {...props} />
  );
});

DrawerClose.displayName = 'DrawerClose';
