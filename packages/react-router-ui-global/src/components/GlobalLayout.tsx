import * as React from 'react';
import classnames from 'classnames';
import { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import {
  Sidebar,
  SidebarInset,
  SidebarRail,
} from '@openthrottle/react-router-shadcn';
import { GlobalSidebarContent } from './GlobalSidebarContent';
import { GlobalSidebarFooter } from './GlobalSidebarFooter';
import { GlobalSidebarHeader } from './GlobalSidebarHeader';
import type { GlobalSidebarContentLinkProps } from './GlobalSidebarContent';

export interface GlobalLayoutProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly data?: Record<string, GlobalSidebarContentLinkProps[]>;
  readonly health?: ServerHealthObject;

  readonly overrides?: {
    readonly footer?: boolean;
    readonly rail?: boolean;
  };
}

/**
 * @description Wraps admin content with a collapsible sidebar (nav) and main content area.
 * Uses shadcn-ui Sidebar for layout; sidebar shows on md+ and as sheet on mobile.
 * Top bar includes SidebarTrigger (keyboard: Cmd/Ctrl+B) to toggle sidebar.
 */
export const GlobalLayout = (props: GlobalLayoutProps): React.ReactElement => {
  const { children, className, data, health, overrides } = props;

  // Hooks

  // Setup
  const hideFooter = overrides?.footer ?? false;
  const hideRail = overrides?.rail ?? false;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <Sidebar
        className={classnames('border-sidebar-border', className)}
        collapsible="icon"
        variant="sidebar"
      >
        <GlobalSidebarHeader name="AI" to="/" />
        <GlobalSidebarContent data={data} />
        {!hideFooter ? <GlobalSidebarFooter health={health} /> : null}
        {!hideRail ? <SidebarRail /> : null}
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </>
  );
};
