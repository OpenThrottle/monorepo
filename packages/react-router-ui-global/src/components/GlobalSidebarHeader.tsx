import * as React from 'react';
import classnames from 'classnames';
import { SidebarHeader } from '@openthrottle/react-router-shadcn';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';

export interface GlobalSidebarHeaderProps {
  readonly className?: string;
  readonly name: string;
  readonly to?: string;
}

export const GlobalSidebarHeader = (props: GlobalSidebarHeaderProps) => {
  const { className, name, to = '/' } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SidebarHeader
      className={classnames(className)}
      data-testid="GlobalSidebarHeader"
    >
      <OpenThrottleLogo name={name} to={to} />
    </SidebarHeader>
  );
};
