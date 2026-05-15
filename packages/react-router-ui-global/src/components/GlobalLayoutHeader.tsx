import * as React from 'react';
import classnames from 'classnames';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  CommandShortcut,
  Input,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { GlobalLayoutBreadcrumbs } from './GlobalLayoutBreadcrumbs';

/**
 * @description Discriminated events from the header chrome search control; the app decides navigation vs commander.
 */
export type GlobalLayoutHeaderSearchEvent =
  | { readonly type: 'engage' }
  | { readonly type: 'submit'; readonly query: string };

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

export const GlobalLayoutHeader = (props: GlobalLayoutHeaderProps) => {
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
      className="max-w-52 relative"
      data-testid="GlobalLayoutHeaderSearch"
      onSubmit={handleSearchSubmit}
    >
      <CommandShortcut className="flex text-sm p-2 items-center justify-center absolute opacity-100 top-1/2 right-4 transform -translate-y-1/2 gap-0.5 w-auto z-10">
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
        'border-b border-border',
        'flex items-center justify-between',
        'py-2 px-4 md:px-8 lg:px-12 gap-4',
        'sticky w-full top-0 z-10',
        className,
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        <Tooltip delayDuration={1_000}>
          <TooltipTrigger asChild={true}>
            <SidebarTrigger
              aria-label="Toggle sidebar"
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
            <SignOutIcon height={22} width={22} />
          </Link>
        </>
      ) : null}
    </nav>
  );
};
