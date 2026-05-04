import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  SidebarProvider,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';

export interface GlobalProvidersProps extends React.PropsWithChildren {}

export const GlobalProviders = (
  props: GlobalProvidersProps,
): React.ReactElement => {
  const { children } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DndProvider backend={HTML5Backend}>
      <SidebarProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </SidebarProvider>
    </DndProvider>
  );
};
