import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import classnames from 'classnames';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { PencilSimpleLineIcon } from '@phosphor-icons/react/dist/ssr/PencilSimpleLine';
import { QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';
import {
  Form,
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { MAIL_PATHS } from '~/global/data/data.navigation';

const SEARCH_DEBOUNCE_MS = 300;

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
  const [inputValue, setInputValue] = React.useState('');
  const [searchParams] = useSearchParams();
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Setup
  const isSearchPage = location.pathname === MAIL_PATHS.search;
  const queryFromUrl = searchParams.get('q') ?? '';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  React.useEffect(() => {
    if (isSearchPage) setInputValue(queryFromUrl);

    // Sync input from URL when navigating to search page or when URL query changes (e.g. after debounced navigate).
  }, [isSearchPage, queryFromUrl]);

  const scheduleSearchNavigate = React.useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const q = value.trim();
        navigate(
          q
            ? `${MAIL_PATHS.search}?q=${encodeURIComponent(q)}`
            : MAIL_PATHS.search,
          {
            replace: true,
            viewTransition: true,
          },
        );
      }, SEARCH_DEBOUNCE_MS);
    },

    // Debounced navigate to search when user types on the search page. Future: consider navigating from any page for live search.
    [navigate],
  );

  React.useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (isSearchPage) scheduleSearchNavigate(value);
  };

  // Breadcrumb: derive from pathname so Sent, Drafts, Trash, Compose, Search show correct label.
  const pathnameNorm = location.pathname.replace(/\/$/, '') || '/';
  const inboxPathNorm = MAIL_PATHS.inbox.replace(/\/$/, '') || '/';
  const breadcrumbPage = ((): string => {
    if (isSearchPage) return 'Search';
    if (pathnameNorm === MAIL_PATHS.compose) return 'Compose';
    if (pathnameNorm === MAIL_PATHS.sent) return 'Sent';
    if (pathnameNorm === MAIL_PATHS.drafts) return 'Drafts';
    if (pathnameNorm === MAIL_PATHS.trash) return 'Trash';
    if (pathnameNorm.startsWith(`${inboxPathNorm}/inbox/`)) return 'Message';
    return 'Inbox';
  })();
  const breadcrumbPageHref = ((): string | null => {
    if (isSearchPage) return MAIL_PATHS.search;
    if (pathnameNorm === MAIL_PATHS.compose) return MAIL_PATHS.compose;
    if (pathnameNorm === MAIL_PATHS.sent) return MAIL_PATHS.sent;
    if (pathnameNorm === MAIL_PATHS.drafts) return MAIL_PATHS.drafts;
    if (pathnameNorm === MAIL_PATHS.trash) return MAIL_PATHS.trash;
    return null;
  })();

  return (
    <header
      className={classnames(
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
              {breadcrumbPageHref != null ? (
                <BreadcrumbLink asChild={true}>
                  <Link to={breadcrumbPageHref} viewTransition={true}>
                    {breadcrumbPage}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{breadcrumbPage}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </nav>

      <Separator className="h-6 shrink-0" orientation="vertical" />

      {/* Action buttons with tooltips; Help popover for quick tips. */}
      <div className="flex shrink-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Button asChild={true} variant="default">
              <Link to={MAIL_PATHS.compose} viewTransition={true}>
                <PencilSimpleLineIcon aria-hidden={true} className="size-4" />
                Compose
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New message</TooltipContent>
        </Tooltip>
        {/* Refresh/Archive/Delete are disabled until the mail API is wired; tooltips flag them as upcoming so they don't read as broken no-ops. */}
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Button
              aria-label="Refresh"
              disabled={true}
              size="icon"
              variant="outline"
            >
              <ArrowsClockwiseIcon aria-hidden={true} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh (coming soon)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Button
              aria-label="Archive"
              disabled={true}
              size="icon"
              variant="outline"
            >
              <ArchiveIcon aria-hidden={true} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Archive selected (coming soon)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Button
              aria-label="Delete"
              disabled={true}
              size="icon"
              variant="outline"
            >
              <TrashIcon aria-hidden={true} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete selected (coming soon)</TooltipContent>
        </Tooltip>
        <Popover>
          <PopoverTrigger asChild={true}>
            <Button
              aria-label="Help"
              data-testid="MailToolbar-help"
              size="icon"
              variant="ghost"
            >
              <QuestionIcon aria-hidden={true} className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <p className="text-sm font-medium">Quick tips</p>
            <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Use search to find messages</li>
              <li>Select rows for bulk actions</li>
              <li>Archive or delete from the reading pane</li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};
