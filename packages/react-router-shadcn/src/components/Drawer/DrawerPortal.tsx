'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

export interface DrawerPortalProps extends React.ComponentProps<
  typeof DrawerPrimitive.Portal
> {}

export const DrawerPortal = (props: DrawerPortalProps): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
};
