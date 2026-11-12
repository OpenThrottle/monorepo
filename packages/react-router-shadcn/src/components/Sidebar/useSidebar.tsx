'use client';

import * as React from 'react';

import type { SidebarContextProps } from './SidebarContext';
import { SidebarContext } from './SidebarContext';

export function useSidebar(): SidebarContextProps {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}
