import { ChatDialog } from '@openthrottle/react-router-chat';
import { NotificationBell } from '@openthrottle/react-router-notifications';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import clsx from 'clsx';
import * as React from 'react';
import { Link } from 'react-router';

import { GlobalLayoutBreadcrumbs } from './GlobalLayoutBreadcrumbs';
import { GlobalLayoutHeaderLinks } from './GlobalLayoutHeaderLinks';
import type { GlobalLayoutHeaderSearchEvent } from './GlobalLayoutHeaderSearch';
import { GlobalLayoutHeaderSearch } from './GlobalLayoutHeaderSearch';

export type { GlobalLayoutHeaderSearchEvent };

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

  // Hooks

  // Setup
  const showProfile = false;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <nav
      className={clsx(
        'bg-card/50 backdrop-blur-sm',
        'border-border border-b',
        'flex items-center justify-between',
        'gap-2 px-2 py-2 sm:gap-4 sm:px-4 md:px-8 lg:px-12',
        // 44px touch targets leave no room for gaps on a phone.
        'pointer-coarse:max-sm:gap-0',
        'sticky top-0 z-10 w-full',
        className,
      )}
      data-testid="global-layout-nav"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 pointer-coarse:max-sm:gap-0">
        <Tooltip delayDuration={1_000}>
          <TooltipTrigger asChild={true}>
            <SidebarTrigger
              aria-label="Toggle sidebar (Cmd/Ctrl+B)"
              className="text-muted-foreground shrink-0 pointer-coarse:size-11"
              title=""
            />
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Toggle sidebar (Cmd/Ctrl+B)</p>
          </TooltipContent>
        </Tooltip>
        <GlobalLayoutBreadcrumbs />
      </div>

      <ChatDialog title="Clutch Assistant" triggerLabel="Chat" />
      <GlobalLayoutHeaderSearch
        onSearchChromeEvent={onSearchChromeEvent}
        onSearchValueChange={onSearchValueChange}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
      />
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
      <GlobalLayoutHeaderLinks />
    </nav>
  );
};
