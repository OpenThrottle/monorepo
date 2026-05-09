import * as React from 'react';
import classnames from 'classnames';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { NavLink } from 'react-router';
import { OPEN_THROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';
import { SITE_SUBDOMAIN } from '~/global/config/settings';

export interface GlobalHeaderProps {
  className?: string;
}

export const GlobalHeader = (props: GlobalHeaderProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

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
        <OpenThrottleLogo className="text-lg" name={SITE_SUBDOMAIN} to="/" />

        <div
          className={classnames(
            'hidden md:flex items-center gap-2',
            '[&__.active]:text-accent [&__.active]:font-bold',
          )}
        >
          <NavLink
            // className="text-sm h-full hover:text-accent p-4 transition"
            target="_blank"
            to={OPEN_THROTTLE_GITHUB_URL}
          >
            <GithubLogoIcon
              className="border rounded-full p-2 text-color-copy hover:text-color-copy transition-colors"
              size={32}
              weight="fill"
            />
          </NavLink>
        </div>
      </div>
    </nav>
  );
};
