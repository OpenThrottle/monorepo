import * as React from 'react';
import {
  SidebarInset,
  SidebarProvider,
  Toaster,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import classnames from 'classnames';
import { MailSidebar } from '~/global/components/MailSidebar';
import { MailToolbar } from '~/global/components/MailToolbar';

export interface MailLayoutProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  /** Initial sidebar open state; when omitted, defaults to true. Pass from loader using cookie for persistence. */
  readonly defaultSidebarOpen?: boolean;
}

/**
 * @description Mail-area layout: sidebar (folder nav) + main content area. Renders {@link MailSidebar} and children (typically an `<Outlet />`) using shadcn-ui SidebarProvider/SidebarInset.
 * Wraps content in TooltipProvider for tooltips and renders Toaster for toast feedback. All UI from @openthrottle/react-router-shadcn for consistency.
 */
export const MailLayout = (props: MailLayoutProps) => {
  const { children, className, defaultSidebarOpen = true } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <SidebarProvider
        className={classnames(className)}
        defaultOpen={defaultSidebarOpen}
      >
        <MailSidebar />
        <SidebarInset
          className="flex min-h-0 flex-1 flex-col"
          data-testid="MailLayout"
        >
          <MailToolbar />
          <main className="w-full flex flex-col gap-6 p-4 md:p-8 lg:p-12">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" richColors={true} />
    </TooltipProvider>
  );
};
