import * as React from 'react';
import classnames from 'classnames';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Input,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { GlobalLayoutBreadcrumbs } from './GlobalLayoutBreadcrumbs';

export interface GlobalLayoutHeaderProps {
  className?: string;
}

export const GlobalLayoutHeader = (props: GlobalLayoutHeaderProps) => {
  const { className } = props;

  // Hooks

  // Setup
  const showProfile = false;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

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
      <Input className="max-w-52" placeholder="Search" type="search" />

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
