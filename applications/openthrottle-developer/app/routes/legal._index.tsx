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
import type { Route } from '@/app/routes/+types/legal._index';
import { opensource } from '~/routing/legal/data/data.opensource';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Legal',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Legal | ${SITE_TITLE}` }];
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
        <p className="text-sm text-muted-foreground">
          <Link
            className="underline underline-offset-4 hover:text-foreground transition-colors"
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
                  className="size-10 grayscale hover:grayscale-0 hover:scale-125 cursor-pointer transition-all duration-300 bg-muted rounded-full p-1"
                  src={image}
                />
              </Link>
            );
          })}
        </div>

        <div className="mt-6 mb-2">
          <p className="text-sm text-muted-foreground">
            Created by{' '}
            <strong>
              <Link
                target="_blank"
                to="https://mattscholta.com?ref=openthrottle-developer"
              >
                Matthew Scholta
              </Link>
            </strong>
            , a software developer with a passion for crafting robust platforms
            and empowering developers. Matthew is dedicated to building
            high-quality, user-focused solutions for the modern developer.
          </p>
        </div>
      </div>

      {/* <ul className="mt-6 list-disc space-y-2 pl-5 text-sm">
        <li>
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to="/legal/license"
          >
            License
          </Link>
        </li>
        <li>
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to="/legal/privacy-policy"
          >
            Privacy policy
          </Link>
        </li>
        <li>
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to="/legal/terms-of-use"
          >
            Terms of use
          </Link>
        </li>
      </ul> */}

      <div className="py-8 relative flex flex-col gap-8">
        <Avatar className="size-24 md:size-32 mx-auto m-4">
          <AvatarImage src="https://avatars.githubusercontent.com/u/545829?v=4" />
          <AvatarFallback className="text-3xl">MS</AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-center-">
          <h2 className="text-xl font-bold mb-4">Matthew Scholta</h2>
          <h3 className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <OpenThrottleClipboard
              label="matthew@openthrottle.com"
              text="matthew@openthrottle.com"
            />
          </h3>
          <div className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <Link
              target="_blank"
              to="https://mattscholta.com?ref=openthrottle-developer"
            >
              mattscholta.com
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
