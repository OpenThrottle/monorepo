import * as React from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openthrottle/react-router-shadcn';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { OPENTHROTTLE_CONTACT_EMAIL } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/profile._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Profile',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Profile | ${SITE_TITLE}` }];
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
    <div className="flex h-full items-center justify-center">
      <div className="relative flex flex-col gap-8 p-12">
        <Avatar className="mx-auto mb-4 size-24 md:mb-4 md:size-32">
          <AvatarImage src="https://avatars.githubusercontent.com/u/545829?v=4" />
          <AvatarFallback className="text-3xl">MS</AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold">Matthew Scholta</h2>
          <h3 className="text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors">
            <OpenThrottleClipboard
              label={OPENTHROTTLE_CONTACT_EMAIL}
              text={OPENTHROTTLE_CONTACT_EMAIL}
            />
          </h3>
          {/*
          <Button size="sm" variant="ghost">
            <PencilIcon className="size-4" />
          </Button>
          */}
        </div>
      </div>
    </div>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
