import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  AgentCliSetupConfigDocument,
  SettingsSetupAgentClisDocument,
} from '~/__generated__/graphql';
import { mergeAgentCliStatuses } from '~/routing/settings/data/agent-clis.data';
import { SettingsSetupCliCard } from '~/routing/settings/components/SettingsSetupCliCard';
import { SettingsSetupCliControls } from '~/routing/settings/components/SettingsSetupCliControls';
import { SettingsSetupIntroduction } from '~/routing/settings/components/SettingsSetupIntroduction';
import type { Route } from '@/app/routes/+types/settings.setup';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Setup',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const [discovery, config] = await Promise.all([
    executeGraphqlWithAuth(args.request, SettingsSetupAgentClisDocument, {}),
    executeGraphqlWithAuth(args.request, AgentCliSetupConfigDocument, {}),
  ]);

  return {
    agents: discovery.discoverAgentClis.agents,
    canManage: config.agentCliSetupConfig.canManage,
    installEnabled: config.agentCliSetupConfig.installEnabled,
    scannedAt: discovery.discoverAgentClis.scannedAt,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Agent CLI setup | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;

  // Hooks

  // Setup
  const statuses = mergeAgentCliStatuses(loaderData.agents);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <SettingsSetupIntroduction scannedAt={loaderData.scannedAt} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statuses.map((status) => (
          <SettingsSetupCliCard
            actions={
              <SettingsSetupCliControls
                canManage={loaderData.canManage}
                installEnabled={loaderData.installEnabled}
                status={status}
              />
            }
            key={status.backend}
            status={status}
          />
        ))}
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
