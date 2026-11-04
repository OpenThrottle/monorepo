import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { BugIcon, EllipsisVerticalIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { GLOBAL_LAYOUT_HEADER_LINKS_COPY } from '../data/data.copy';

export interface GlobalLayoutHeaderLinksProps {}

/**
 * @description Trailing icon links of the global header (GitHub, bug report,
 * sign out). From `sm` up they render inline as icon-only links, each with an
 * `aria-label`. Below `sm` they collapse into one overflow menu so the header
 * never outgrows a phone viewport.
 */
export const GlobalLayoutHeaderLinks = (
  _props: GlobalLayoutHeaderLinksProps,
): React.ReactElement => {
  // Hooks

  // Setup
  const githubHref = `${OPENTHROTTLE_GITHUB_URL}/monorepo`;
  const bugHref = `${OPENTHROTTLE_GITHUB_URL}/monorepo/issues/new/choose`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="contents" data-testid="GlobalLayoutHeaderLinks">
      <div
        className="hidden sm:contents"
        data-testid="GlobalLayoutHeaderLinksInline"
      >
        <Button
          asChild={true}
          className="text-foreground relative size-6 shrink-0 rounded-full pointer-coarse:size-11"
          variant="ghost"
        >
          <Link
            aria-label={GLOBAL_LAYOUT_HEADER_LINKS_COPY.github}
            target="_blank"
            to={githubHref}
          >
            <GithubLogoIcon />
          </Link>
        </Button>
        <Button
          asChild={true}
          className="text-foreground relative size-6 shrink-0 rounded-full pointer-coarse:size-11"
          variant="ghost"
        >
          <Link
            aria-label={GLOBAL_LAYOUT_HEADER_LINKS_COPY.reportBug}
            target="_blank"
            to={bugHref}
          >
            <BugIcon />
          </Link>
        </Button>
        <Button
          asChild={true}
          className="text-foreground relative size-6 shrink-0 rounded-full pointer-coarse:size-11"
          variant="ghost"
        >
          <Link
            aria-label={GLOBAL_LAYOUT_HEADER_LINKS_COPY.signOut}
            reloadDocument={true}
            to="/auth/logout"
          >
            <SignOutIcon />
          </Link>
        </Button>
      </div>
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild={true}>
            <Button
              aria-label={GLOBAL_LAYOUT_HEADER_LINKS_COPY.menuLabel}
              className="relative size-6 shrink-0 rounded-full pointer-coarse:size-11"
              type="button"
              variant="ghost"
            >
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild={true}>
              <Link target="_blank" to={githubHref}>
                <GithubLogoIcon className="mr-2 size-4" />
                {GLOBAL_LAYOUT_HEADER_LINKS_COPY.github}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild={true}>
              <Link target="_blank" to={bugHref}>
                <BugIcon className="mr-2 size-4" />
                {GLOBAL_LAYOUT_HEADER_LINKS_COPY.reportBug}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild={true}>
              <Link reloadDocument={true} to="/auth/logout">
                <SignOutIcon className="mr-2 size-4" />
                {GLOBAL_LAYOUT_HEADER_LINKS_COPY.signOut}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
