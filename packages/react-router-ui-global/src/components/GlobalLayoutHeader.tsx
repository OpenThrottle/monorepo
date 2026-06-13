import * as React from 'react';
import classnames from 'classnames';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  CommandShortcut,
  Input,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Form, Link } from 'react-router';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { GlobalLayoutBreadcrumbs } from './GlobalLayoutBreadcrumbs';
import { ChatDialog } from '@openthrottle/react-router-chat';
import { NotificationBell } from '@openthrottle/react-router-notifications';
import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';

/**
 * @description Discriminated events from the header chrome search control; the app decides navigation vs commander.
 */
export type GlobalLayoutHeaderSearchEvent =
  | { readonly type: 'engage' }
  | { readonly query: string; readonly type: 'submit' };

export interface GlobalLayoutHeaderProps {
  readonly className?: string;
  /**
   * @description When set, wires focus → `engage` and form submit → `submit` for non-empty trimmed query.
   */
  readonly onSearchChromeEvent?: (event: GlobalLayoutHeaderSearchEvent) => void;
  readonly onSearchValueChange?: (value: string) => void;
  readonly searchPlaceholder?: string;
  /**
   * @description When defined with {@link GlobalLayoutHeaderProps.onSearchValueChange}, controls the draft query in the chrome search field.
   */
  readonly searchValue?: string;
}

export const GlobalLayoutHeader = (
  props: GlobalLayoutHeaderProps,
): React.ReactElement => {
  const {
    className,
    onSearchChromeEvent,
    onSearchValueChange,
    searchPlaceholder = 'Search',
    searchValue,
  } = props;

  const [draftQuery, setDraftQuery] = React.useState('');
  const isSearchControlled = searchValue !== undefined;
  const resolvedSearchValue = isSearchControlled ? searchValue : draftQuery;

  const handleSearchDraftChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const next = event.target.value;
    if (isSearchControlled) {
      onSearchValueChange?.(next);
    } else {
      setDraftQuery(next);
    }
  };

  const handleSearchEngage = (): void => {
    onSearchChromeEvent?.({ type: 'engage' });
  };

  const handleSearchSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();
    if (!onSearchChromeEvent) {
      return;
    }
    const trimmed = resolvedSearchValue.trim();
    if (trimmed.length > 0) {
      onSearchChromeEvent({ query: trimmed, type: 'submit' });
    }
  };

  // Hooks

  // Setup
  const showProfile = false;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  const searchField = onSearchChromeEvent ? (
    <form
      className="relative max-w-52"
      data-testid="GlobalLayoutHeaderSearch"
      onSubmit={handleSearchSubmit}
    >
      <CommandShortcut className="absolute top-1/2 right-4 z-10 flex w-auto -translate-y-1/2 transform items-center justify-center gap-0.5 p-2 text-sm opacity-100">
        <span>⌘</span>
        <span>+</span>
        <span>k</span>
      </CommandShortcut>
      <Input
        aria-label={searchPlaceholder}
        className="w-full"
        onChange={handleSearchDraftChange}
        onFocus={handleSearchEngage}
        placeholder={searchPlaceholder}
        type="search"
        value={resolvedSearchValue}
      />
    </form>
  ) : (
    <>
      <CommandShortcut>⌘K</CommandShortcut>
      <Input
        className="max-w-52"
        placeholder={searchPlaceholder}
        type="search"
      />
    </>
  );

  return (
    <nav
      className={classnames(
        'bg-card/50 backdrop-blur-sm',
        'border-border border-b',
        'flex items-center justify-between',
        'gap-4 px-4 py-2 md:px-8 lg:px-12',
        'sticky top-0 z-10 w-full',
        className,
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        <Tooltip delayDuration={1_000}>
          <TooltipTrigger asChild={true}>
            <SidebarTrigger
              aria-label="Toggle sidebar (Cmd/Ctrl+B)"
              className="text-muted-foreground"
              title=""
            />
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Toggle sidebar (Cmd/Ctrl+B)</p>
          </TooltipContent>
        </Tooltip>
        <GlobalLayoutBreadcrumbs />
      </div>

      <ChatDialog
        title="OpenThrottle Assistant"
        triggerLabel="Chat"
        // variant="sheet"
        variant="dialog"
      />

      {searchField}
      {showProfile ? (
        <>
          <Link className="text-foreground" to="/profile">
            <Avatar className="size-6">
              <AvatarImage src="https://avatars.githubusercontent.com/u/545829?v=4" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </Link>
          <Link className="text-foreground" to="/auth/logout">
            <SignOutIcon className="size-5" />
          </Link>
        </>
      ) : null}

      <NotificationBell />

      <Link
        className="text-foreground"
        target="_blank"
        to={OPENTHROTTLE_GITHUB_URL}
      >
        <Button
          className="relative size-6 shrink-0 rounded-full"
          variant="ghost"
        >
          <GithubLogoIcon />
        </Button>
      </Link>

      <Form action="/" className="flex items-center gap-2" method="post">
        <input name="intent" type="hidden" value="logout" />
        <Button
          className="relative size-6 shrink-0 rounded-full"
          variant="ghost"
        >
          <SignOutIcon />
        </Button>
      </Form>
    </nav>
  );
};
