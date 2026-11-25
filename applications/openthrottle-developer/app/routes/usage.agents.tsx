import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { BotIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/usage.agents';
import { GetUsageTokenUsageDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { UsagePageIntroduction } from '~/routing/usage/components/UsagePageIntroduction';
import { UsageTokenUsage } from '~/routing/usage/components/UsageTokenUsage';
import { TOKEN_USAGE_COPY } from '~/routing/usage/data/token-usage-copy';
import { getUsageRange } from '~/routing/usage/utils/getUsageRange';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Agents usage',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const searchParams = new URL(args.request.url).searchParams;
  const providerParam = searchParams.get('provider');
  const selectedProvider =
    providerParam !== null && providerParam !== '' ? providerParam : null;

  const accountParam = searchParams.get('account');
  const selectedAccount =
    accountParam !== null && accountParam !== '' ? accountParam : null;

  const { endDate, rangeDays, startDate } = getUsageRange();

  const tokenUsageResult = await executeGraphqlWithAuth(
    args.request,
    GetUsageTokenUsageDocument,
    {
      accountId: selectedAccount,
      end: endDate,
      provider: selectedProvider,
      start: startDate,
    },
  );

  return {
    rangeDays,
    selectedAccount,
    selectedProvider,
    tokenUsageByAccount: tokenUsageResult.tokenUsage.byAccount,
    tokenUsageItems: tokenUsageResult.tokenUsage.items,
    tokenUsageTotals: tokenUsageResult.tokenUsage.totals,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Agents usage | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const {
    rangeDays,
    selectedAccount,
    selectedProvider,
    tokenUsageByAccount,
    tokenUsageItems,
    tokenUsageTotals,
  } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <UsagePageIntroduction icon={BotIcon} title={TOKEN_USAGE_COPY.heading}>
        {TOKEN_USAGE_COPY.intro(rangeDays)}
      </UsagePageIntroduction>
      <UsageTokenUsage
        byAccount={tokenUsageByAccount}
        items={tokenUsageItems}
        selectedAccount={selectedAccount}
        selectedProvider={selectedProvider}
        totals={tokenUsageTotals}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
