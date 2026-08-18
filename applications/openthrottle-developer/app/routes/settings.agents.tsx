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
  SettingsAgentsAgentClisDocument,
} from '~/__generated__/graphql';
import {
  filterAgentCliStatuses,
  mergeAgentCliStatuses,
  type AgentCliFilter,
} from '~/routing/settings/data/agent-clis.data';
import { SettingsAgentsIntroduction } from '~/routing/settings/components/SettingsAgentsIntroduction';
import { SettingsAgentsTable } from '~/routing/settings/components/SettingsAgentsTable';
import { SettingsAgentsToolbar } from '~/routing/settings/components/SettingsAgentsToolbar';
import type { Route } from '@/app/routes/+types/settings.agents';
import { SettingsAgentsInstallNotice } from '~/routing/settings/components/SettingsAgentsInstallNotice';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Agents',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const [discovery, config] = await Promise.all([
    executeGraphqlWithAuth(args.request, SettingsAgentsAgentClisDocument, {}),
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
  return [{ title: `Agents | Settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { installEnabled } = loaderData;

  // Hooks
  const [filter, setFilter] = React.useState<AgentCliFilter>('all');

  // Setup
  const statuses = mergeAgentCliStatuses(loaderData.agents);
  const visibleStatuses = filterAgentCliStatuses(statuses, filter);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <SettingsAgentsIntroduction scannedAt={loaderData.scannedAt} />
      <div className="mt-6 flex flex-col gap-4">
        <SettingsAgentsToolbar
          filter={filter}
          installEnabled={installEnabled}
          onFilterChange={setFilter}
        />
        <SettingsAgentsTable
          canManage={loaderData.canManage}
          installEnabled={installEnabled}
          statuses={visibleStatuses}
        />
        <SettingsAgentsInstallNotice installEnabled={installEnabled} />
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
