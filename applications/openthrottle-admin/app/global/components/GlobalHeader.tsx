import * as React from 'react';
import classnames from 'classnames';
import { Button } from '@openthrottle/react-router-shadcn';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { Form, NavLink } from 'react-router';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';
import {
  FEATURE_BETA_PREVIEW,
  OPEN_THROTTLE_GITHUB_URL,
} from '@openthrottle/react-router-utils';
import { dataNavigation } from '~/global/data/data.navigation';
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
  const renderNavItems = () => {
    if (!FEATURE_BETA_PREVIEW) return null;

    return (
      <>
        {dataNavigation.map((item) => (
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
        <OpenThrottleLogo className="text-lg" name={SITE_SUBDOMAIN} to="/" />

        <div
          className={classnames(
            'hidden md:flex items-center gap-2',
            '[&__.active]:text-accent [&__.active]:font-bold',
          )}
        >
          <div className="flex gap-1 mr-8 h-full">{renderNavItems()}</div>

          <Form action="/" method="post">
            <input name="intent" type="hidden" value="signout" />
            <Button
              className="flex items-center gap-2"
              type="submit"
              variant="ghost"
            >
              <SignOutIcon className="size-5" />
              Sign out
            </Button>
          </Form>

          <Button
            asChild={true}
            className="relative size-8 shrink-0 rounded-full"
            variant="ghost"
          >
            <NavLink target="_blank" to={OPEN_THROTTLE_GITHUB_URL}>
              <GithubLogoIcon className="size-5" />
            </NavLink>
          </Button>
        </div>
      </div>
    </nav>
  );
};
