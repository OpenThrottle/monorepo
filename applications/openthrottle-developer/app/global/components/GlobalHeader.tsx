import * as React from 'react';
import classnames from 'classnames';
import { Avatar, AvatarImage, Button } from '@openthrottle/react-router-shadcn';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { ListCheckIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';
import {
  FEATURE_BETA_PREVIEW,
  OPEN_THROTTLE_GITHUB_URL,
} from '@openthrottle/react-router-utils';
import { NotificationBell } from '@openthrottle/react-router-notifications';
import { useAtom } from 'jotai';
import { dataNavigation } from '~/global/data/data.navigation';
import { SITE_URL_QUEUES, SITE_SUBDOMAIN } from '~/global/config/settings';
import { userAtom } from '~/global/data/atom.user';

export interface GlobalHeaderProps {
  className?: string;
}

export const GlobalHeader = (props: GlobalHeaderProps) => {
  const { className } = props;

  // Hooks
  const [user] = useAtom(userAtom);

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
        {/* {renderUserProfile()} */}
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

          <Button
            asChild={true}
            className="size-8 rounded-full"
            variant="ghost"
          >
            <NavLink target="_blank" to={OPEN_THROTTLE_GITHUB_URL}>
              <GithubLogoIcon className="size-8" />
            </NavLink>
          </Button>

          {FEATURE_BETA_PREVIEW && (
            <Button
              asChild={true}
              className="size-8 rounded-full"
              variant="ghost"
            >
              <NavLink target="_blank" to={SITE_URL_QUEUES}>
                <ListCheckIcon className="size-8" />
              </NavLink>
            </Button>
          )}

          {FEATURE_BETA_PREVIEW && <NotificationBell />}

          {!!user && (
            <NavLink to="/settings" viewTransition={true}>
              <Avatar className="size-6 ml-2">
                <AvatarImage src="https://avatars.githubusercontent.com/u/545829?v=4" />
              </Avatar>
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};
