import * as React from 'react';
import { SidebarProvider } from '@openthrottle/react-router-shadcn';

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

  return <SidebarProvider>{children}</SidebarProvider>;
};
