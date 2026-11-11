import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BlocksIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/blocks._index';
import { SITE_TITLE } from '~/global/config/settings';
import { BlocksPreview } from '~/routing/blocks/components/BlocksPreview';
import { BLOCKS_COPY } from '~/routing/blocks/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => BLOCKS_COPY.title,
  links: (_match) => [],
};

export const loader = async (
  _args: Route.LoaderArgs,
): Promise<Record<string, never>> => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = (_args) => {
  return [{ title: `${BLOCKS_COPY.title} | ${SITE_TITLE}` }];
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
          icon={BlocksIcon}
          title={BLOCKS_COPY.title}
        />
        <p className="text-muted-foreground mb-8 text-sm">
          {BLOCKS_COPY.description}
        </p>
        <BlocksPreview className={undefined} />
      </div>
    </GlobalScreen>
  );
}

export const action = async (
  _args: Route.ActionArgs,
): Promise<Record<string, never>> => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
