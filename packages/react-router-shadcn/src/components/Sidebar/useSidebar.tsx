'use client';

import * as React from 'react';

import { SidebarContext } from './sidebar-context';
import type { SidebarContextProps } from './sidebar-context';

export function useSidebar(): SidebarContextProps {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}
