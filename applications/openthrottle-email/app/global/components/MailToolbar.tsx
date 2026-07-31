import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Input,
  Separator,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Form, Link } from 'react-router';
import { MailToolbarActions } from '~/global/components/MailToolbarActions';
import { MAIL_PATHS } from '~/global/data/data.navigation';
import { useMailToolbar } from '~/global/hooks/useMailToolbar';

export interface MailToolbarProps {
  readonly className?: string;
}

/**
 * @description Toolbar for the mail area: search, navigation (breadcrumb), and action buttons. Uses shadcn-ui components.
 * Search: form submit and debounced input navigate to /mail/search?q=... so results are shareable and update as you type.
 */
export const MailToolbar = (props: MailToolbarProps): React.ReactElement => {
  const { className } = props;

  // Hooks
  const { breadcrumb, handleSearchChange, inputValue } = useMailToolbar();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <header
      className={clsx(
        'flex min-w-0 flex-wrap items-center gap-3 px-4 py-3',
        'border-border bg-background/95 border-b',
        'sticky top-0 z-50',
        className,
      )}
      data-testid="MailToolbar"
      role="toolbar"
    >
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <SidebarTrigger
            aria-label="Toggle sidebar"
            data-testid="MailToolbar-sidebarTrigger"
          />
        </TooltipTrigger>
        <TooltipContent side="right">Toggle sidebar (⌘B)</TooltipContent>
      </Tooltip>
      <Separator className="h-6 shrink-0" orientation="vertical" />
      {/* Search: form submit goes to /mail/search?q=...; on search page, typing updates URL after debounce for dynamic results. */}
      <div className="flex min-w-0 flex-1 basis-48 items-center" role="search">
        <Form
          action={MAIL_PATHS.search}
          className="relative flex w-full max-w-sm items-center"
          method="get"
        >
          <MagnifyingGlassIcon
            aria-hidden={true}
            className="text-muted-foreground pointer-events-none absolute left-3 size-4"
          />
          <Input
            aria-label="Search mail"
            className="pl-9"
            name="q"
            onChange={handleSearchChange}
            placeholder="Search mail"
            type="search"
            value={inputValue}
          />
        </Form>
      </div>

      <Separator className="h-6 shrink-0" orientation="vertical" />

      {/* Navigation (breadcrumb): Mail links to inbox; current area is linked when not Message. */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 shrink items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild={true}>
                <Link to={MAIL_PATHS.inbox} viewTransition={true}>
                  Mail
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {breadcrumb.href != null ? (
                <BreadcrumbLink asChild={true}>
                  <Link to={breadcrumb.href} viewTransition={true}>
                    {breadcrumb.page}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{breadcrumb.page}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </nav>

      <Separator className="h-6 shrink-0" orientation="vertical" />

      {/* Action buttons with tooltips; Help popover for quick tips. */}
      <MailToolbarActions />
    </header>
  );
};
