'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

export interface DrawerTriggerProps extends React.ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Trigger
> {}

export const DrawerTrigger = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Trigger>,
  DrawerTriggerProps
>((props, ref): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DrawerPrimitive.Trigger data-slot="drawer-trigger" ref={ref} {...props} />
  );
});

DrawerTrigger.displayName = 'DrawerTrigger';
