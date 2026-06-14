import * as React from 'react';
import classnames from 'classnames';
import { APP_NAME_SHORT } from '@openthrottle/react-router-utils';
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
import { useScrollContainerRestoration } from '../hooks/useScrollContainerRestoration';

export interface GlobalLayoutProps {
  readonly authenticated?: boolean;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly data?: Record<string, GlobalSidebarContentLinkProps[]>;
  readonly health?: ServerHealthObject;

  readonly overrides?: {
    readonly footer?: boolean;
    readonly header?: boolean;
    readonly rail?: boolean;
  };
}

/**
 * @description Wraps admin content with a collapsible sidebar (nav) and main content area.
 * Uses shadcn-ui Sidebar for layout; sidebar shows on md+ and as sheet on mobile.
 * Top bar includes SidebarTrigger (keyboard: Cmd/Ctrl+B) to toggle sidebar.
 */
export const GlobalLayout = (props: GlobalLayoutProps): React.ReactElement => {
  const {
    authenticated = false,
    children,
    className,
    data,
    health,
    overrides,
  } = props;

  // Hooks
  const refScrollableContent = React.useRef<HTMLDivElement>(null);

  // Setup
  const hideFooter = overrides?.footer ?? false;
  const hideRail = overrides?.rail ?? false;

  // Handlers

  // Markup

  // Life Cycle
  useScrollContainerRestoration(refScrollableContent);

  // 🔌 Short Circuit

  return (
    <>
      <Sidebar
        className={classnames('border-sidebar-border', className)}
        collapsible="icon"
        variant="sidebar"
      >
        <GlobalSidebarHeader name={APP_NAME_SHORT} to="/" />
        <GlobalSidebarContent
          data={data}
          defaultSectionsExpanded={false}
          sectionDefaultExpanded={{
            Agents: true,
            Legal: authenticated ? false : true,
            Settings: false,
            User: false,
            Workspace: true,
          }}
        />
        {!hideFooter ? <GlobalSidebarFooter health={health} /> : null}
        {!hideRail ? <SidebarRail /> : null}
      </Sidebar>
      <div
        className="relative flex max-h-screen w-full max-w-full flex-col overflow-auto"
        ref={refScrollableContent}
      >
        <SidebarInset>{children}</SidebarInset>
      </div>
    </>
  );
};
