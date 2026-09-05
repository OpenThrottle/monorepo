import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GetRolloutFlagDocument } from '~/__generated__/graphql';
import { RolloutFlagDetail } from '~/routing/settings/components/RolloutFlagDetail';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import type { Route } from '@/app/routes/+types/settings.rollout.$flagId._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.flag.key ?? 'Flag',
  links: (_match) => [
    { children: 'Settings', to: '/settings' },
    { children: ROLLOUT_COPY.title, to: '/settings/rollout' },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const data = await executeGraphqlWithAuth(
    args.request,
    GetRolloutFlagDocument,
    { id: args.params.flagId },
  );

  if (!data.rolloutFlag) {
    throw new Response('Feature flag not found', { status: 404 });
  }

  return { flag: data.rolloutFlag };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const key = args.loaderData?.flag.key ?? 'Flag';
  return [{ title: `${key} | Rollout | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  const { loaderData } = props;
  const { flag } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <RolloutFlagDetail
        editTo={`/settings/rollout/${flag.id}/edit`}
        flag={flag}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
