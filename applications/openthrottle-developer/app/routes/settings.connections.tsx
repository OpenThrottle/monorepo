import { toErrorMessageOr } from '@openthrottle/nodejs-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { PlugZapIcon } from 'lucide-react';
import * as React from 'react';
import { data } from 'react-router';

import type { Route } from '@/app/routes/+types/settings.connections';
import {
  RevokeOAuthGrantDocument,
  SettingsConnectionsDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { SettingsConnectionsTable } from '~/routing/settings/components/SettingsConnectionsTable';
import { SETTINGS_CONNECTIONS_COPY as COPY } from '~/routing/settings/data/copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => COPY.title,
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const result = await executeGraphqlWithAuth(
    args.request,
    SettingsConnectionsDocument,
  );
  return { connections: result.myOAuthGrants };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${COPY.title} | Settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { connections } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="mb-6 space-y-2">
        <GlobalHeading heading="h1" icon={PlugZapIcon} title={COPY.title} />
        <p className="text-muted-foreground max-w-3xl text-sm">
          {COPY.description}
        </p>
      </div>
      <SettingsConnectionsTable connections={connections} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const grantId = formData.get('grantId');
  if (typeof grantId !== 'string' || grantId === '') {
    return data({ error: 'Missing connection id.' }, 400);
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      RevokeOAuthGrantDocument,
      { id: grantId },
    );
    if (!result.revokeOAuthGrant) {
      return data({ error: COPY.revokeFailed }, 404);
    }
    return { ok: true };
  } catch (error) {
    return data({ error: toErrorMessageOr(error, COPY.revokeFailed) }, 400);
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
