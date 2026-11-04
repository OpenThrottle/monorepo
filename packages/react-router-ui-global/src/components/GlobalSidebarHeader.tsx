import { cn, SidebarHeader } from '@openthrottle/react-router-shadcn';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';
import * as React from 'react';

export interface GlobalSidebarHeaderProps {
  readonly className?: string;
  readonly name: string;
  readonly to?: string;
}

export const GlobalSidebarHeader = (
  props: GlobalSidebarHeaderProps,
): React.ReactElement => {
  const { className, name, to = '/' } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SidebarHeader className={cn(className)} data-testid="GlobalSidebarHeader">
      <OpenThrottleLogo name={name} to={to} />
    </SidebarHeader>
  );
};
