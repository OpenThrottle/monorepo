import * as React from 'react';
import classnames from 'classnames';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { NavLink } from 'react-router';
import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';
import { SITE_SUBDOMAIN } from '~/global/config/settings';

export interface GlobalHeaderProps {
  className?: string;
}

export const GlobalHeader = (props: GlobalHeaderProps): React.ReactElement => {
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
        'border-border border-b',
        'bg-card/50 backdrop-blur-sm',
        'sticky top-0 z-50 w-full px-4',
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <OpenThrottleLogo className="text-lg" name={SITE_SUBDOMAIN} to="/" />

        <div
          className={classnames(
            'hidden items-center gap-2 md:flex',
            '[&__.active]:text-accent [&__.active]:font-bold',
          )}
        >
          <NavLink
            // className="text-sm h-full hover:text-accent p-4 transition"
            target="_blank"
            to={OPENTHROTTLE_GITHUB_URL}
          >
            <GithubLogoIcon
              className="text-color-copy hover:text-color-copy rounded-full border p-2 transition-colors"
              size={32}
              weight="fill"
            />
          </NavLink>
        </div>
      </div>
    </nav>
  );
};
