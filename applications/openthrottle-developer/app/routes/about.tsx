import * as React from 'react';
import { Link } from 'react-router';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { opensource } from '~/routing/legal/data/data.opensource';
import {
  OPENTHROTTLE_CONTACT_EMAIL,
  OPENTHROTTLE_CONTACT_PORTFOLIO,
  OPENTHROTTLE_CONTACT_PORTFOLIO_REF,
} from '@openthrottle/react-router-utils';
import type { Route } from '@/app/routes/+types/about';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'About',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `About | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BookOpenIcon}
          title="About"
        />
        <p className="text-muted-foreground text-sm">
          <Link
            className="hover:text-foreground underline underline-offset-4 transition-colors"
            target="_blank"
            to="https://github.com/OpenThrottle?ref=openthrottle"
          >
            OpenThrottle
          </Link>{' '}
          is a suite of Open Source and AI-backed tools for developers to create
          and manage their projects.
        </p>

        <div className="my-4 flex flex-wrap gap-4">
          {opensource.map((data) => {
            const { image, name, url } = data;

            return (
              <Link key={url} target="_blank" to={url}>
                <img
                  alt={name}
                  className="bg-muted size-10 cursor-pointer rounded-full p-1 grayscale transition-all duration-300 hover:scale-125 hover:rotate-12 hover:grayscale-0"
                  src={image}
                />
              </Link>
            );
          })}
        </div>

        <div className="mt-6 mb-2">
          <p className="text-muted-foreground text-sm">
            Created by{' '}
            <strong>
              <Link target="_blank" to={OPENTHROTTLE_CONTACT_PORTFOLIO_REF}>
                Matthew Scholta
              </Link>
            </strong>
            , a software developer with a passion for crafting robust platforms
            and empowering developers. Matthew is dedicated to building
            high-quality, user-focused solutions for the modern developer.
          </p>
        </div>
      </div>

      <div className="relative flex flex-col gap-8 py-8">
        <Avatar className="m-4 mx-auto size-24 md:size-32">
          <AvatarImage src="https://avatars.githubusercontent.com/u/545829?v=4" />
          <AvatarFallback className="text-3xl">MS</AvatarFallback>
        </Avatar>

        <div className="items-center- flex flex-col">
          <h2 className="mb-4 text-xl font-bold">Matthew Scholta</h2>
          <h3 className="text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors">
            <OpenThrottleClipboard
              label={OPENTHROTTLE_CONTACT_EMAIL}
              text={OPENTHROTTLE_CONTACT_EMAIL}
            />
          </h3>
          <div className="text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors">
            <Link target="_blank" to={OPENTHROTTLE_CONTACT_PORTFOLIO_REF}>
              {OPENTHROTTLE_CONTACT_PORTFOLIO}
            </Link>
          </div>
        </div>
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
