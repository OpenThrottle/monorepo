import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { getEnvironment } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetRootHealthDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { SettingsDebugPanel } from '~/routing/settings/components/SettingsDebugPanel';
import { sanitizeEnvForDiagnostics } from '~/routing/settings/utils/sanitize-client-env';
import type { Route } from '@/app/routes/+types/settings.debug';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Debug',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const envSnapshot = sanitizeEnvForDiagnostics(getEnvironment());
  const started = performance.now();
  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      GetRootHealthDocument,
    );
    const latencyMs = Math.round(performance.now() - started);
    return {
      envSnapshot,
      graphQL: {
        latencyMs,
        serverHealth: data.serverHealth,
        status: 'ok' as const,
      },
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    const message = error instanceof Error ? error.message : String(error);
    return {
      envSnapshot,
      graphQL: {
        error: message,
        latencyMs,
        status: 'error' as const,
      },
    };
  }
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Settings | Debug | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!loaderData) {
    return (
      <GlobalScreen>
        <p className="text-muted-foreground text-sm">Loading diagnostics…</p>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen>
      <SettingsDebugPanel
        envSnapshot={loaderData.envSnapshot}
        graphQL={loaderData.graphQL}
      />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
