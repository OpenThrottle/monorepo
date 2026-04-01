import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@openthrottle/react-router-shadcn';
import { Form } from 'react-router';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { GlobalNavigation } from '~/global/components/GlobalNavigation';

export interface AdminLayoutProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * @description Wraps admin content with a collapsible sidebar (nav) and main content area.
 * Uses shadcn-ui Sidebar for layout; sidebar shows on md+ and as sheet on mobile.
 * Top bar includes SidebarTrigger (keyboard: Cmd/Ctrl+B) to toggle sidebar.
 */
export const AdminLayout = (props: AdminLayoutProps): React.ReactElement => {
  const { children, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SidebarProvider>
      <Sidebar
        className={classnames('border-r border-sidebar-border', className)}
        collapsible="icon"
      >
        <GlobalNavigation />
      </Sidebar>
      <SidebarInset>
        <header
          className={classnames(
            'flex flex-wrap items-center justify-between gap-3 px-4 py-3 min-w-0',
            'border-b border-border bg-background/95',
            'sticky top-0 z-50',
          )}
          data-testid="AdminLayout-header"
        >
          <SidebarTrigger aria-label="Toggle sidebar" />

          <Form action="/" method="post">
            <input name="intent" type="hidden" value="signout" />
            <Button
              className="flex items-center gap-2 p-2"
              type="submit"
              variant="ghost"
            >
              <SignOutIcon className="size-5" />
              Sign out
            </Button>
          </Form>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};
