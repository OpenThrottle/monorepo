import * as React from 'react';
import classnames from 'classnames';
import { SidebarHeader } from '@openthrottle/react-router-shadcn';
import { OpenThrottleLogo } from './OpenThrottleLogo';

export interface OpenThrottleSidebarHeaderProps {
  readonly className?: string;
  readonly name: string;
  readonly to?: string;
}

export const OpenThrottleSidebarHeader = (
  props: OpenThrottleSidebarHeaderProps,
): React.ReactElement => {
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
      data-testid="OpenThrottleSidebarHeader"
    >
      <OpenThrottleLogo name={name} to={to} />
    </SidebarHeader>
  );
};
