import * as React from 'react';
import classnames from 'classnames';
import type { LinkProps } from 'react-router';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { NavLink } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';
import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import { MAIL_PATHS } from '~/global/data/data.navigation';

/**
 * @deprecated Commented out in root layout; kept for intentional rollback. See root.tsx.
 */

const headerNavigation: LinkProps[] = [
  { children: 'Inbox', to: MAIL_PATHS.inbox },
  { children: 'Sent', to: MAIL_PATHS.sent },
  { children: 'Drafts', to: MAIL_PATHS.drafts },
  { children: 'Trash', to: MAIL_PATHS.trash },
  { children: 'Search', to: MAIL_PATHS.search },
  { children: 'Compose', to: MAIL_PATHS.compose },
  { children: 'Settings', to: '/settings' },
];

export interface GlobalHeaderProps {
  className?: string;
}

export const GlobalHeader = (props: GlobalHeaderProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const renderNavItems = () => {
    return (
      <>
        {headerNavigation.map((item) => (
          <NavLink
            className="text-sm h-full hover:text-accent p-4 transition"
            key={item.to.toString()}
            to={item.to}
            viewTransition={true}
          >
            {item.children}
          </NavLink>
        ))}
      </>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <nav
      className={classnames(
        'border-b border-border',
        'bg-card/50 backdrop-blur-sm',
        'px-4 sticky w-full top-0 z-50',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <OpenThrottleLogo
          className="text-lg"
          name="Email"
          to={MAIL_PATHS.inbox}
        />

        <div
          className={classnames(
            'hidden md:flex items-center gap-2',
            '[&__.active]:text-accent [&__.active]:font-bold',
          )}
        >
          <div className="flex gap-1 mr-8 h-full">{renderNavItems()}</div>

          <Button
            asChild={true}
            className="relative size-8 shrink-0 rounded-full"
            variant="ghost"
          >
            <NavLink target="_blank" to={OPENTHROTTLE_GITHUB_URL}>
              <GithubLogoIcon className="size-5" />
            </NavLink>
          </Button>
        </div>
      </div>
    </nav>
  );
};
